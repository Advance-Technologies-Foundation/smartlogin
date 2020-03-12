(function() {
	require.config({
		paths: {
			"SmartLogin-BootstrapModules": Terrasoft.getFileContentUrl("smartlogin", "src/js/BaseViewModuleOverrideBootstrap.js")
		},
		map: {
			"SmartLogin-BootstrapModules": {
				"BootstrapModules": "BootstrapModules"
			},
			"*": {
				"BootstrapModules": "SmartLogin-BootstrapModules"
			}
		}
	});
})();