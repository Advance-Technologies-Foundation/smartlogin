//Added stored last url hash in DomainCache
define("BaseViewModule", ["BaseViewModuleResources", "performancecountermanager",
	"ConfigurationConstants", "ServiceHelper", "ViewGeneratorV2"
], function(resources, performanceCounterManager, ConfigurationConstants, serviceHelper) {

	/**
	 * The base class module of visual presentation.
	 */
	Ext.define("Terrasoft.configuration.BaseViewModule", {
		extend: "Terrasoft.core.BaseObject",
		alternateClassName: "Terrasoft.BaseViewModule",

		Ext: null,
		sandbox: null,
		Terrasoft: null,

		/**
		 * Wait interval in milliseconds for debouncing {@link #onLoadModule} method. At the end of this interval,
		 * the {@link #onLoadModule} method will be called with the most recently arguments.
		 * @protected
		 * @type {Number}
		 */
		loadModuleDelay: 30,

		/**
		 * A sign of async module.
		 * @type {Boolean}
		 */
		isAsync: true,

		/**
		 * The last state hash.
		 * @type {Object}
		 */
		currentHash: {
			historyState: ""
		},

		/**
		 * Code of the home page by default.
		 * @type {String}
		 */
		defaultHomeModule: ConfigurationConstants.DefaultHomeModule,

		/**
		 * Code of the home page.
		 * @type {String}
		 */
		homeModule: "",

		/**
		 * The name of the main container module.
		 * @type {Object[]}
		 */
		containerName: "ViewModuleContainer",

		/**
		 * The configuration of the module view.
		 * @type {Object[]}
		 */
		viewConfig: null,

		/**
		 * The class name of the generator representation.
		 * @type {String}
		 */
		viewGeneratorClass: "Terrasoft.ViewGenerator",

		/**
		 * The difference in the representation scheme.
		 * @type {Object[]}
		 */
		diff: [{
			"operation": "insert",
			"name": "centerPanel",
			"values": {
				"id": "centerPanel",
				"selectors": {"wrapEl": "#centerPanel"},
				"itemType": Terrasoft.ViewItemType.CONTAINER,
				"wrapClass": ["default-center-panel-content"]

			}
		}],

		/**
		 * @inheritdoc Terrasoft.BaseObject#constructor
		 * @override
		 */
		constructor: function() {
			this.callParent(arguments);
			this.delayedLoadModule = Terrasoft.debounce(this.onLoadModule, this.loadModuleDelay);
		},

		/**
		 * Init module.
		 * @param {Function} callback The callback function.
		 * @param {Object} scope The scope of callback function.
		 */
		init: function(callback, scope) {
			Terrasoft.chain(
				this.initSysSettings,
				this.initViewConfig,
				this.initHomePage,
				function() {
					this.subscribeMessages();
					callback.call(scope);
				},
				this
			);
		},

		/**
		 * Display view.
		 * @param {Ext.Element} renderTo The reference to the container in which to display the view.
		 */
		render: function(renderTo) {
			this.renderView(renderTo);
			this.loadNonVisibleModules();
			this.initHistoryState();
		},

		/**
		 * Checks whether the execution context is an instance of a class, or a basic prototype.
		 * @protected
		 * @return {Boolean} Returns true if current execution context is an instance of a class
		 * false otherwise.
		 */
		isInstance: function() {
			return this.hasOwnProperty("instanceId") && this.instanceId;
		},

		/**
		 * Creates a schema view based on the parameter difference for the whole class hierarchy.
		 * @protected
		 * @return {Object[]} Returns the schema of the view.
		 */
		getSchema: function() {
			var baseSchema = [];
			if (this.superclass.getSchema) {
				baseSchema = this.superclass.getSchema();
			}
			return this.hasDiff() ? Terrasoft.JsonApplier.applyDiff(baseSchema, this.diff) : baseSchema;
		},

		/**
		 * Checks if the context parameter of the difference scheme.
		 * @protected
		 * @return {Boolean} Returns true if so, false otherwise.
		 */
		hasDiff: function() {
			var isInstance = this.isInstance();
			var diff = this.diff;
			return (isInstance && (diff !== this.superclass.diff)) ||
				(!isInstance && (this.hasOwnProperty("diff") && !Ext.isEmpty(diff)));
		},

		/**
		 * Creates a configuration module view.
		 * @protected
		 * @param {Object} config A configuration object.
		 * @param {Function} callback The callback function.
		 * @param {Object} scope The scope of callback function.
		 */
		buildView: function(config, callback, scope) {
			var viewGenerator = this.createViewGenerator();
			var schema = {
				viewConfig: this.getSchema()
			};
			var viewConfig = Ext.apply({
				schema: schema
			}, config);
			viewGenerator.generate(viewConfig, callback, scope);
		},

		/**
		 * Initialisere configuration object module view.
		 * @protected
		 * @param {Function} callback The callback function.
		 * @param {Object} scope The scope of callback function.
		 */
		initViewConfig: function(callback, scope) {
			var generatorConfig = {};
			generatorConfig.viewModelClass = this.self;
			this.buildView(generatorConfig, function(view) {
				this.viewConfig = view;
				callback.call(scope);
			}, this);
		},

		/**
		 * Creates an instance of the class Terrasoft.ViewGenerator.
		 * @protected
		 * @return {Terrasoft.ViewGenerator}
		 */
		createViewGenerator: function() {
			return this.Ext.create(this.viewGeneratorClass);
		},

		/**
		 * Initialisere basic system settings.
		 * @protected
		 * @param {Function} callback The callback function.
		 * @param {Object} scope The scope of callback function.
		 */
		initSysSettings: function(callback, scope) {
			const settingsNames = this.getSysSettingsNames();
			Terrasoft.SysSettings.querySysSettings(settingsNames, function(values) {
				this.onSysSettingsResponse(values);
				callback.call(scope);
			}, this);
		},

		/**
		 * Returns an array of the names of the system settings whose values are queried and cached when you log in
		 * system user.
		 * @protected
		 * @return {String[]} Array with the names of the system settings whose values are queried and cached when
		 * the logon user.
		 */
		getSysSettingsNames: function() {
			return ["BuildType", "ShowDemoLinks", "PrimaryCulture", "SchedulerTimingStart",
				"SchedulerTimingEnd", "SchedulerDisplayTimingStart"];
		},

		/**
		 * Processes the results of loading the system settings.
		 * @protected
		 */
		onSysSettingsResponse: Terrasoft.emptyFn,

		/**
		 * Creates and loads the main panel of the website.
		 * @protected
		 * @param {Ext.Element} renderTo The reference to the container in which to display the view.
		 */
		renderView: function(renderTo) {
			this.view = this.Ext.create("Terrasoft.Container", {
				id: this.containerName,
				selectors: {wrapEl: "#" + this.containerName},
				items: Terrasoft.deepClone(this.viewConfig),
				markerValue: this.containerName
			});
			this.view.render(renderTo);
		},

		/**
		 * Initializes the initial state.
		 * @protected
		 */
		initHistoryState: function() {
			var token = this.sandbox.publish("GetHistoryState");
			if (token) {
				this.onHistoryStateChanged(token, true);
			}
		},

		/**
		 * @deprecated
		 */
		checkWebSocketSupport: Terrasoft.emptyFn,

		/**
		 * Downloads invisible utility modules.
		 * @protected
		 */
		loadNonVisibleModules: function() {
			this.sandbox.loadModule("NavigationModule");
		},

		/**
		 * Subscribes to messages.
		 * @protected
		 */
		subscribeMessages: function() {
			var sandbox = this.sandbox;
			sandbox.subscribe("LoadModule", this.onLoadModule, this);
			sandbox.subscribe("HistoryStateChanged", function(token) {
				this.onHistoryStateChanged(token);
			}, this);
			sandbox.subscribe("RefreshCacheHash", this.refreshCacheHash, this);
			sandbox.subscribe("NavigationModuleLoaded", this.loadMainPanelsModules, this);
		},

		/**
		 * Loads the modules in the main panel.
		 * @protected
		 */
		loadMainPanelsModules: function() {
			var schema = this.getSchema();
			Terrasoft.iterateChildItems(schema, function(iterationConfig) {
				var item = iterationConfig.item;
				if (item.itemType === Terrasoft.ViewItemType.MODULE) {
					this.onLoadModule({
						moduleName: item.moduleName,
						renderTo: item.name
					});
				}
			}, this);
			this.loadHomePage();
		},

		/**
		 * Init code of the home page for the current user.
		 * @protected
		 * @param {Function} callback The callback function.
		 * @param {Object} scope The scope of callback function.
		 */
		initHomePage: function(callback, scope) {
			serviceHelper.callService({
				serviceName: "CurrentUserService",
				methodName: "GetCurrentUserHomePage",
				callback: function(response, success) {
					if (success && response && response.homePage) {
						this.homeModule = response.homePage;
					} else {
						if (Terrasoft.CurrentUser.userType === Terrasoft.UserType.SSP) {
							this.initHomePageFromSysSettings(callback, scope);
							return;
						}
						this.homeModule = this.defaultHomeModule;
					}
					Ext.callback(callback, scope || this);
				},
				scope: this
			});
		},

		/**
		 * Initializes code of the home page for the current user from system settings.
		 * @protected
		 * @param {Function} callback The callback function.
		 * @param {Object} scope The scope of callback function.
		 */
		initHomePageFromSysSettings: function(callback, scope) {
			var sysSettingsCodes = ["SSPMainPage"];
			Terrasoft.SysSettings.querySysSettings(sysSettingsCodes, function(sysSettings) {
				if (sysSettings) {
					var sysSettingsSSPMainPage = sysSettings.SSPMainPage;
					var mainPageModuleId = sysSettingsSSPMainPage.value;
					Terrasoft.each(Terrasoft.configuration.ModuleStructure, function(module) {
						if (module.moduleId === mainPageModuleId) {
							this.homeModule = module.entitySchemaName;
							return false;
						}
					}, this);
				} else {
					this.homeModule = this.defaultHomeModule;
				}
				Ext.callback(callback, scope || this);
			}, this);
		},

		/**
		 * Loading module.
		 * @protected
		 * @param {Object} config Load module config.
		 * @param {String} config.renderTo Name of the module container.
		 * @param {String} config.moduleId The unique module identifier.
		 * @param {String} config.moduleName Name of the module.
		 * @param {Boolean} config.keepAlive The sign of the previous module loaded into the container
		 * will be destroyed there.
		 * @param {Object} [config.instanceConfig] Config for module instance.
		 */
		onLoadModule: function(config) {
			var renderTo = config.renderTo;
			if (!Ext.isEmpty(renderTo)) {
				var moduleConfig = {
					renderTo: renderTo,
					id: config.moduleId,
					keepAlive: config.keepAlive || false
				};
				this.sandbox.loadModule(config.moduleName, moduleConfig);
			}
		},

		/**
		 * Loads module. If called multiple times in row only the last module will be loaded.
		 * @private
		 * @param {Object} config Load module config used in {@link #onLoadModule} method.
		 */
		delayedLoadModule: Terrasoft.emptyFn,

		/**
		 * Finds module name in the object browser state.
		 * @protected
		 * @param {Object} token The state object browser.
		 * @return {String} Returns the name of the module.
		 */
		getModuleName: function(token) {
			return token.hash ? token.hash.moduleName : null;
		},

		/**
		 * Processed traditionally t the status change. Starts the timer performance.
		 * @protected
		 */
		onStateChanged: function() {
			performanceCounterManager.clearAllTimeStamps();
			performanceCounterManager.setTimeStamp("StateChanged");
		},

		/**
		 * Handles new condition, loads the module chain.
		 * @protected
		 * @param {Object} token The object of the new browser state.
		 */
		loadChainModule: function(token) {
			var currentState = this.sandbox.publish("GetHistoryState");
			var moduleId = currentState.state && currentState.state.moduleId;
			var moduleName = this.getModuleName(token);
			if (!moduleId || !moduleName) {
				return;
			}
			this.onStateChanged();
			this.onLoadModule({
				moduleName: moduleName,
				moduleId: moduleId,
				renderTo: "centerPanel"
			});
		},

		/**
		 * Processes new state, loads module.
		 * @protected
		 * @param {Object} token New browser state object.
		 * @param {Boolean} [immediateLoad] If defined as true, new module will be loaded immediately,
		 * otherwise it will be loaded with {@link #loadModuleDelay} delay.
		 */
		loadModuleFromHistoryState: function(token, immediateLoad) {
			var moduleName = this.getModuleName(token);
			if (!moduleName) {
				return;
			}
			var currentState = this.sandbox.publish("GetHistoryState");
			var keepAlive = this.Ext.isObject(currentState.state) ? currentState.state.keepAlive : false;
			var id = this.generateModuleId(moduleName, currentState);
			this.onStateChanged();
			var config = {
				moduleName: moduleName,
				moduleId: id,
				renderTo: "centerPanel",
				keepAlive: keepAlive
			};
			if (immediateLoad === true) {
				this.onLoadModule(config);
			} else {
				this.delayedLoadModule(config);
			}
		},

		/**
		 * Generates module unique id base on module name and current state.
		 * @protected
		 * @param {String} moduleName Module name.
		 * @param {Object} currentState Browser state object.
		 * @return {String} Returns module unique identifier.
		 */
		generateModuleId: function(moduleName, currentState) {
			var id = currentState.state && currentState.state.id;
			var result = moduleName;
			var hash = currentState.hash;
			var schemaName = (currentState.hash && currentState.hash.entityName) || "";
			if (!this.Ext.isEmpty(hash) && !this.Ext.isEmpty(hash.recordId)) {
				result += "_" + hash.recordId;
			}
			return id || result + "_" + schemaName;
		},

		/**
		 * Processes state changes. Loads require modules.
		 * @protected
		 * @param {Object} token Browser new state object.
		 * @param {Boolean} [immediateLoad] If defined as true, new module will be loaded immediately,
		 * otherwise it will be loaded with {@link #loadModuleDelay} delay.
		 */
		onHistoryStateChanged: function(token, immediateLoad) {
			if (token && token.hash && token.hash.historyState) {
				Terrasoft.DomainCache.setItem("lastHash", token.hash.historyState);
			}
			if (this.currentHash.historyState === token.hash.historyState) {
				this.loadChainModule(token);
			} else {
				this.refreshCacheHash();
				this.loadModuleFromHistoryState(token, immediateLoad);
			}
		},

		/**
		 * Updates the current status for the module.
		 * @protected
		 */
		refreshCacheHash: function() {
			var currentHistoryState = this.sandbox.publish("GetHistoryState");
			if (currentHistoryState && currentHistoryState.hash && currentHistoryState.hash.historyState) {
				Terrasoft.DomainCache.setItem("lastHash", currentHistoryState.hash.historyState);
			}
			this.currentHash.historyState = currentHistoryState.hash.historyState;
		},

		/**
		 * Opens the home page, if the status was not ascertained.
		 * @protected
		 */
		loadHomePage: function() {
			var state = this.sandbox.publish("GetHistoryState");
			var hash = state.hash;
			if (hash.historyState) {
				if (hash.moduleName === "MainMenu") {
					this.replaceHomePage();
				}
			} else {
				this.openHomePage();
			}
		},

		/**
		 * Opens the home page.
		 * @protected
		 */
		openHomePage: function() {
			var hash = this.getHomePagePath();
			this.sandbox.publish("PushHistoryState", {hash: hash});
		},

		/**
		 * Replaces the current home page.
		 * @private
		 */
		replaceHomePage: function() {
			var hash = this.getHomePagePath();
			this.sandbox.publish("ReplaceHistoryState", {hash: hash});
		},

		/**
		 * Returns the path to the home page.
		 * @protected
		 * @return {String}
		 */
		getHomePagePath: function() {
			var lastHash = Terrasoft.DomainCache.getItem("lastHash");
			if (lastHash) {
				return lastHash;
			}
			const module = Terrasoft.configuration.ModuleStructure[this.homeModule];
			const path = module
				? Terrasoft.combinePath(module.sectionModule, module.sectionSchema)
				: this.getHomeModulePath();
			return path;
		},

		/**
		 * Returns the path to the starting module.
		 * @protected
		 * @return {String}
		 */
		getHomeModulePath: function() {
			return this.homeModule;
		}
	});

	return Terrasoft.BaseViewModule;

});
