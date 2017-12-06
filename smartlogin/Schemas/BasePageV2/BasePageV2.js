define("BasePageV2", [], function() {
	return {
		methods: {
			activeTabChange: function(activeTab) {
				this.callParent(arguments);
				var activeTabName = activeTab.get("Name");
				if (activeTabName) {
					Terrasoft.DomainCache.setItem(this.$className + ":activeTan", activeTabName);
				}
			},

			getDefaultTabName: function() {
				var tabsCollection = this.get("TabsCollection");
				if (!tabsCollection || tabsCollection.isEmpty()) {
					return null;
				}
				var defaultTabName = Terrasoft.DomainCache.getItem(this.$className + ":activeTan");
				if (defaultTabName) {
					this.set("DefaultTabName", defaultTabName);
				} else {
					defaultTabName = this.callParent(arguments);
				}
				return defaultTabName;
			}
		},
		diff:/**SCHEMA_DIFF*/[]/**SCHEMA_DIFF*/,
		modules:/**SCHEMA_MODULES*/{}/**SCHEMA_MODULES*/,
		details:/**SCHEMA_DETAILS*/{}/**SCHEMA_DETAILS*/
	};
});
