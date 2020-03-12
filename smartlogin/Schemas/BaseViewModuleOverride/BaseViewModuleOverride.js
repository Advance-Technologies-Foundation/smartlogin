define("BaseViewModuleOverride", ["BaseViewModule"], function() {

	Ext.override(Ext.ClassManager.get("Terrasoft.configuration.BaseViewModule"), {

		onHistoryStateChanged: function(token, immediateLoad) {
			if (token && token.hash && token.hash.historyState) {
				Terrasoft.DomainCache.setItem("lastHash", token.hash.historyState);
			}
			this.callParent(arguments);
		},

		refreshCacheHash: function() {
			const currentHistoryState = this.sandbox.publish("GetHistoryState");
			if (currentHistoryState && currentHistoryState.hash && currentHistoryState.hash.historyState) {
				Terrasoft.DomainCache.setItem("lastHash", currentHistoryState.hash.historyState);
			}
			this.callParent(arguments);
		},

		getHomePagePath: function() {
			const lastHash = Terrasoft.DomainCache.getItem("lastHash");
			if (lastHash) {
				return lastHash;
			}
			return this.callParent(arguments);
		}

	});

	return Terrasoft.BaseViewModule;

});
