package plugincontext

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/infra/localcache"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/adapters"
	"github.com/grafana/grafana/pkg/services/datasources"
	"github.com/grafana/grafana/pkg/services/encryption"
	"github.com/grafana/grafana/pkg/services/pluginsettings"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/util/errutil"
)

func ProvideService(bus bus.Bus, cacheService *localcache.CacheService, pluginManager plugins.Manager,
	dataSourceCache datasources.CacheService, encryptionService encryption.Service,
	pluginSettingsService *pluginsettings.Service) *Provider {
	return &Provider{
		Bus:                   bus,
		CacheService:          cacheService,
		PluginManager:         pluginManager,
		DataSourceCache:       dataSourceCache,
		EncryptionService:     encryptionService,
		PluginSettingsService: pluginSettingsService,
		logger:                log.New("plugincontext"),
	}
}

type Provider struct {
	Bus                   bus.Bus
	CacheService          *localcache.CacheService
	PluginManager         plugins.Manager
	DataSourceCache       datasources.CacheService
	EncryptionService     encryption.Service
	PluginSettingsService *pluginsettings.Service
	logger                log.Logger
}

// Get allows getting plugin context by its ID. If datasourceUID is not empty string
// then PluginContext.DataSourceInstanceSettings will be resolved and appended to
// returned context.
func (p *Provider) Get(pluginID string, datasourceUID string, user *models.SignedInUser, skipCache bool) (backend.PluginContext, bool, error) {
	pc := backend.PluginContext{}
	plugin := p.PluginManager.GetPlugin(pluginID)
	if plugin == nil {
		return pc, false, nil
	}

	jsonData := json.RawMessage{}
	decryptedSecureJSONData := map[string]string{}
	var updated time.Time

	ps, err := p.getCachedPluginSettings(pluginID, user)
	if err != nil {
		// models.ErrPluginSettingNotFound is expected if there's no row found for plugin setting in database (if non-app plugin).
		// If it's not this expected error something is wrong with cache or database and we return the error to the client.
		if !errors.Is(err, models.ErrPluginSettingNotFound) {
			return pc, false, errutil.Wrap("Failed to get plugin settings", err)
		}
	} else {
		jsonData, err = json.Marshal(ps.JsonData)
		if err != nil {
			return pc, false, errutil.Wrap("Failed to unmarshal plugin json data", err)
		}
		decryptedSecureJSONData = p.PluginSettingsService.DecryptedValues(ps)
		updated = ps.Updated
	}

	pCtx := backend.PluginContext{
		OrgID:    user.OrgId,
		PluginID: plugin.Id,
		User:     adapters.BackendUserFromSignedInUser(user),
		AppInstanceSettings: &backend.AppInstanceSettings{
			JSONData:                jsonData,
			DecryptedSecureJSONData: decryptedSecureJSONData,
			Updated:                 updated,
		},
	}

	if datasourceUID != "" {
		ds, err := p.DataSourceCache.GetDatasourceByUID(datasourceUID, user, skipCache)
		if err != nil {
			return pc, false, errutil.Wrap("Failed to get datasource", err)
		}
		datasourceSettings, err := adapters.ModelToInstanceSettings(ds, p.decryptSecureJsonDataFn())
		if err != nil {
			return pc, false, errutil.Wrap("Failed to convert datasource", err)
		}
		pCtx.DataSourceInstanceSettings = datasourceSettings
	}

	return pCtx, true, nil
}

const pluginSettingsCacheTTL = 5 * time.Second
const pluginSettingsCachePrefix = "plugin-setting-"

func (p *Provider) getCachedPluginSettings(pluginID string, user *models.SignedInUser) (*models.PluginSetting, error) {
	cacheKey := pluginSettingsCachePrefix + pluginID

	if cached, found := p.CacheService.Get(cacheKey); found {
		ps := cached.(*models.PluginSetting)
		if ps.OrgId == user.OrgId {
			return ps, nil
		}
	}

	query := models.GetPluginSettingByIdQuery{PluginId: pluginID, OrgId: user.OrgId}
	if err := p.Bus.Dispatch(&query); err != nil {
		return nil, err
	}

	p.CacheService.Set(cacheKey, query.Result, pluginSettingsCacheTTL)
	return query.Result, nil
}

func (p *Provider) decryptSecureJsonDataFn() func(map[string][]byte) map[string]string {
	return func(m map[string][]byte) map[string]string {
		decryptedJsonData, err := p.EncryptionService.DecryptJsonData(context.Background(), m, setting.SecretKey)
		if err != nil {
			p.logger.Error("Failed to decrypt secure json data", "error", err)
		}
		return decryptedJsonData
	}
}
