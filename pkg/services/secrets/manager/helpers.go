package manager

import (
	"testing"

	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/services/encryption/ossencryption"
	"github.com/grafana/grafana/pkg/services/secrets"
	"github.com/grafana/grafana/pkg/services/secrets/database"
	"github.com/grafana/grafana/pkg/services/secrets/fakes"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/stretchr/testify/require"

	"gopkg.in/ini.v1"
)

func SetupTestService(tb testing.TB, db *sqlstore.SQLStore) *SecretsService {
	if db == nil {
		return setupTestService(tb, fakes.NewFakeSecretsStore())
	}
	return setupTestService(tb, database.ProvideSecretsStore(db))
}

func setupTestService(tb testing.TB, store secrets.Store) *SecretsService {
	tb.Helper()
	defaultKey := "SdlklWklckeLS"
	if len(setting.SecretKey) > 0 {
		defaultKey = setting.SecretKey
	}
	raw, err := ini.Load([]byte(`
		[security]
		secret_key = ` + defaultKey))
	require.NoError(tb, err)
	settings := &setting.OSSImpl{Cfg: &setting.Cfg{Raw: raw}}

	return ProvideSecretsService(
		store,
		bus.New(),
		ossencryption.ProvideService(),
		settings,
	)
}
