package notifiers

import (
	"testing"

	"github.com/grafana/grafana/pkg/components/simplejson"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/encryption/ossencryption"
	. "github.com/smartystreets/goconvey/convey"
)

func TestLineNotifier(t *testing.T) {
	Convey("Line notifier tests", t, func() {
		Convey("empty settings should return error", func() {
			json := `{ }`

			settingsJSON, _ := simplejson.NewJson([]byte(json))
			model := &models.AlertNotification{
				Name:     "line_testing",
				Type:     "line",
				Settings: settingsJSON,
			}

			_, err := NewLINENotifier(model, ossencryption.ProvideService().GetDecryptedValue)
			So(err, ShouldNotBeNil)
		})
		Convey("settings should trigger incident", func() {
			json := `
			{
  "token": "abcdefgh0123456789"
			}`
			settingsJSON, _ := simplejson.NewJson([]byte(json))
			model := &models.AlertNotification{
				Name:     "line_testing",
				Type:     "line",
				Settings: settingsJSON,
			}

			not, err := NewLINENotifier(model, ossencryption.ProvideService().GetDecryptedValue)
			lineNotifier := not.(*LineNotifier)

			So(err, ShouldBeNil)
			So(lineNotifier.Name, ShouldEqual, "line_testing")
			So(lineNotifier.Type, ShouldEqual, "line")
			So(lineNotifier.Token, ShouldEqual, "abcdefgh0123456789")
		})
	})
}
