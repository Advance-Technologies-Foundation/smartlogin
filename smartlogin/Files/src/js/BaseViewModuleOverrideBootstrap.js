define("SmartLogin-BootstrapModules", ["ext-base", "BootstrapModules"], function(Ext, BootstrapModules) {
	return Ext.apply(BootstrapModules || {}, {
		"BaseViewModuleOverride": {}
	});
});