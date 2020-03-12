define("BasePageV2", [], function() {
	return {
		methods: {
			activeTabChange: function(activeTab) {
				this.callParent(arguments);
				const activeTabName = activeTab.get("Name");
				if (activeTabName && !this.get("IsProcessMode")) {
					Terrasoft.DomainCache.setItem(this.$className + ":activeTab", activeTabName);
				}
			},

			getDefaultTabName: function() {
				const tabsCollection = this.get("TabsCollection");
				if (!tabsCollection || tabsCollection.isEmpty()) {
					return null;
				}
				let defaultTabName = Terrasoft.DomainCache.getItem(this.$className + ":activeTab");
				if (defaultTabName && !this.get("IsProcessMode")) {
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
