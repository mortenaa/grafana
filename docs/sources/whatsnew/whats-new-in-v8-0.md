+++
title = "What's new in Grafana v8.0"
description = "Feature and improvement highlights for Grafana v8.0"
keywords = ["grafana", "new", "documentation", "8.0", "release notes"]
weight = -33
aliases = ["/docs/grafana/latest/guides/whats-new-in-v8-0/"]
[_build]
list = false
+++

# What’s new in Grafana v8.0

> **Note:** This topic will be updated frequently between now and the final release.

This topic includes the release notes for Grafana v8.0. For all details, read the full [CHANGELOG.md](https://github.com/grafana/grafana/blob/master/CHANGELOG.md).

## Grafana OSS features

These features are included in the Grafana open source edition.

### Library panels

Library panels allow users to build panels that can be used in multiple dashboards. Any updates made to that shared panel will then automatically be applied to all the dashboards that have that panel.

### Timeline panel

Shows discrete status or state transitions of something over time. For example daily uptime or multi-sensor and digital I/O status.

### Bar chart panel

New visualization that allows categorical data display. Following the new panel architecture supports field config and overrides, common tooltip, and legend options.

### Panel editor updates

- All options are now shown in a single pane.
- You can now search panel options.
- Value mapping has been completely redesigned.

### Download logs

You can now download log results as a text (.txt) file. You can access this feature through the Data tab in the Panel inspector and Inspector in Explore.

### Inspector in Explore

The new Explore inspector helps you understand and troubleshoot your queries. You can inspect the raw data, export that data to a comma-separated values (CSV) file, export log results in text format, and view query requests.

### Log improvements

Logs navigation next to the log lines can be used to request more logs. You can do this by clicking on the Older logs button on the bottom of navigation. This is especially useful when you hit the line limit and you want to see more logs. Each request that is run from the navigation is then displayed in the navigation as a separate page. Every page is showing from and to timestamp of the incoming log lines. You can re-rerun the same request by clicking on the page.

### Tracing improvements

- Exemplars
- Better Jaeger search in Explore
- Show trace graph for Jaeger, Zipkin, and Tempo

### Plugin marketplace

You can now use the Plugin Marketplace app to easily manage your plugins from within Grafana. Install, update, and uninstall plugins without requiring a server restart.

## Enterprise features

These features are included in the Grafana Enterprise edition.

### Fine-grained access control

You can now add or remove detailed permissions from Viewer, Editor, and Admin org roles, to grant users just the right amount of access within Grafana. Available permissions include the ability to view and manage Users, Reports, and the Access Control API itself. Grafana will support more and more permissions over the coming months.

### Data source query caching

Grafana will now cache the results of backend data source queries, so that multiple users viewing the same dashboard or panel will not each submit the same query to the data source (like Splunk or Snowflake) itself. This results in faster average load times for dashboards and fewer duplicate queries overall to data sources, which reduces cost and the risk of throttling, reaching API limits, or overloading your data sources. Caching can be enabled per-data source, and time-to-live (TTL) can be configured globally and per data source. Query caching can be set up with Redis, Memcached, or a simple in-memory cache.

### Reporting updates

When creating a report, you can now choose to export Table Panels as .csv files attached to your report email. This will make it easier for recipients to view and work with that data. You can also link back to the dashboard directly from the email, for users who want to see the data live in Grafana. This release also includes some improvements to the Reports list view.

## Breaking changes

The following breaking changes are included in this release.

### Variables

- Removed the **Value groups/tags** feature from variables. Any tags will be removed.
- Removed the `never` refresh option for query variables. Existing variables will be migrated and any stored options will be removed.

Documentation was updated to reflect these changes.
