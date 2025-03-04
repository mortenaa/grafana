package testdatasource

import (
	"context"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
	"github.com/grafana/grafana-plugin-sdk-go/data"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/setting"
)

func ProvideService(cfg *setting.Cfg, features *featuremgmt.FeatureToggles) *Service {
	s := &Service{
		features:  features,
		queryMux:  datasource.NewQueryTypeMux(),
		scenarios: map[string]*Scenario{},
		frame: data.NewFrame("testdata",
			data.NewField("Time", nil, make([]time.Time, 1)),
			data.NewField("Value", nil, make([]float64, 1)),
			data.NewField("Min", nil, make([]float64, 1)),
			data.NewField("Max", nil, make([]float64, 1)),
		),
		labelFrame: data.NewFrame("labeled",
			data.NewField("labels", nil, make([]string, 1)),
			data.NewField("Time", nil, make([]time.Time, 1)),
			data.NewField("Value", nil, make([]float64, 1)),
		),
		logger: log.New("tsdb.testdata"),
		cfg:    cfg,
	}

	s.registerScenarios()
	s.resourceHandler = httpadapter.New(s.registerRoutes())

	return s
}

type Service struct {
	cfg             *setting.Cfg
	logger          log.Logger
	scenarios       map[string]*Scenario
	frame           *data.Frame
	labelFrame      *data.Frame
	queryMux        *datasource.QueryTypeMux
	resourceHandler backend.CallResourceHandler
	features        *featuremgmt.FeatureToggles
}

func (s *Service) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	return s.queryMux.QueryData(ctx, req)
}

func (s *Service) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	return s.resourceHandler.CallResource(ctx, req, sender)
}
