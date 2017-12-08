// This is overriden module !!! 1
define("BaseViewModule", ["ext-base", "terrasoft", "BaseViewModuleResources", "performancecountermanager",
	"ConfigurationConstants", "ViewGeneratorV2"],
	function(Ext, Terrasoft, resources, performanceCounterManager, ConfigurationConstants) {
		Ext.define("Terrasoft.configuration.BaseViewModule", {
			extend: "Terrasoft.BaseObject",
			alternateClassName: "Terrasoft.BaseViewModule",
			Ext: null,
			sandbox: null,
			Terrasoft: null,
			loadModuleDelay: 30,
			isAsync: true,
			currentHash: {
				historyState: ""
			},
			defaultHomeModule: ConfigurationConstants.DefaultHomeModule,
			homeModule: "",
			containerName: "ViewModuleContainer",
			viewConfig: null,
			viewGeneratorClass:  "Terrasoft.ViewGenerator",
			diff: [{
				"operation": "insert",
				"name": "centerPanel",
				"values": {
					"id": "centerPanel",
					"selectors": { "wrapEl": "#centerPanel" },
					"itemType": Terrasoft.ViewItemType.CONTAINER,
					"wrapClass": ["default-center-panel-content"]

				}
			}],
			constructor: function() {
				this.callParent(arguments);
				this.delayedLoadModule = Terrasoft.debounce(this.onLoadModule, this.loadModuleDelay);
			},
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
			render: function(renderTo) {
				this.renderView(renderTo);
				this.loadNonVisibleModules();
				this.initHistoryState();
				this.checkWebSocketSupport();
			},
			isInstance: function() {
				return this.hasOwnProperty("instanceId") && this.instanceId;
			},
			getSchema: function() {
				var baseSchema = [];
				if (this.superclass.getSchema) {
					baseSchema = this.superclass.getSchema();
				}
				return this.hasDiff() ? Terrasoft.JsonApplier.applyDiff(baseSchema, this.diff) : baseSchema;
			},
			hasDiff: function() {
				var isInstance = this.isInstance();
				var diff = this.diff;
				return (isInstance && (diff !== this.superclass.diff)) ||
					(!isInstance && (this.hasOwnProperty("diff") && !Ext.isEmpty(diff)));
			},
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
			initViewConfig: function(callback, scope) {
				var generatorConfig = {};
				generatorConfig.viewModelClass = this.self;
				this.buildView(generatorConfig, function(view) {
					this.viewConfig = view;
					callback.call(scope);
				}, this);
			},
			createViewGenerator: function() {
				return this.Ext.create(this.viewGeneratorClass);
			},
			initSysSettings: function(callback, scope) {
				Terrasoft.SysSettings.querySysSettings(this.getSysSettingsNames(), function(values) {
					this.onSysSettingsResponse(values);
					callback.call(scope);
				}, this);
			},
			getSysSettingsNames: function() {
				return ["BuildType", "ShowDemoLinks", "PrimaryCulture", "SchedulerTimingStart",
					"SchedulerTimingEnd", "SchedulerDisplayTimingStart", "PrimaryCurrency"];
			},
			onSysSettingsResponse: Terrasoft.emptyFn,
			renderView: function(renderTo) {
				var view = this.view = this.Ext.create("Terrasoft.Container", {
					id: this.containerName,
					selectors: {wrapEl: "#" +  this.containerName},
					items: Terrasoft.deepClone(this.viewConfig),
					markerValue: this.containerName
				});
				view.render(renderTo);
			},

			/**
			 * Initializes the initial state.
			 * @protected
			 * @virtual
			 */
			initHistoryState: function() {
				var token = this.sandbox.publish("GetHistoryState");
				if (token) {
					this.onHistoryStateChanged(token, true);
				}
			},

			/**
			 * ######### ######### ######### WebSocket.
			 * @protected
			 * @virtual
			 */
			checkWebSocketSupport: function() {
				var isFlashError = window.WEB_SOCKET_SWF_EXCEPTION || false;
				if (isFlashError) {
					var buttonsConfig = {
						buttons: [Terrasoft.MessageBoxButtons.OK.returnCode],
						defaultButton: 0
					};
					Terrasoft.showInformation(resources.localizableStrings.SwfException,
						this.onFlashPlayerDownload, this, buttonsConfig);
				}
			},

			/**
			 * ######### #### ######## ########## flashplayer.
			 * @protected
			 * @virtual
			 * @param {Object} result ######### ###### ############### ####.
			 */
			onFlashPlayerDownload: function(result) {
				if (result === Terrasoft.MessageBoxButtons.OK.returnCode) {
					window.open("http://get.adobe.com/ru/flashplayer/", "_blank");
				}
			},

			/**
			 * ######### #########, ######### ######.
			 * @protected
			 * @virtual
			 */
			loadNonVisibleModules: function() {
				var sandbox = this.sandbox;
				sandbox.loadModule("NavigationModule");
			},

			/**
			 * Subscribes to messages.
			 * @protected
			 * @virtual
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
			 * ######### ###### # ######## ######.
			 * @protected
			 * @virtual
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
			 * ############## ### ######## ######## ### ######## ############.
			 * @protected
			 * @virtual
			 * @param {Function} callback #######, ####### ##### ####### ## ##########.
			 * @param {Object} scope ########, # ####### ##### ####### ####### callback.
			 */
			initHomePage: function(callback, scope) {
				var esq = Ext.create("Terrasoft.EntitySchemaQuery", {
					rootSchemaName: "SysAdminUnit"
				});
				esq.addColumn("HomePage.Code", "Code");
				esq.getEntity(Terrasoft.SysValue.CURRENT_USER.value, function(result) {
					this.homeModule = this.defaultHomeModule;
					var entity = result.entity;
					if (result.success && entity) {
						this.homeModule = entity.get("Code") || this.homeModule;
					}
					callback.call(scope);
				}, this);
			},

			/**
			 * Loading module.
			 * @protected
			 * @virtual
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
			 * ####### ### ###### # ####### ######### ########.
			 * @protected
			 * @virtual
			 * @param {Object} token ###### ######### ########.
			 * @return {String} ########## ### ######.
			 */
			getModuleName: function(token) {
				return token.hash ? token.hash.moduleName : null;
			},

			/**
			 * ########### ######### #########. ######### ###### ##################.
			 * @protected
			 * @virtual
			 */
			onStateChanged: function() {
				performanceCounterManager.clearAllTimeStamps();
				performanceCounterManager.setTimeStamp("StateChanged");
			},

			/**
			 * ############ ##### #########, ######### ###### #######.
			 * @protected
			 * @virtual
			 * @param {Object} token ###### ###### ######### ########.
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
			 * @virtual
			 * @param {Object} token New browser state object.
			 * @param {Boolean} [immediateLoad] If defined as true, new module will be loaded immediately,
			 * otherwise it will be loaded with {@link #loadModuleDelay} delay.
			 */
			loadModuleFromHistoryState: function(token, immediateLoad) {
				var moduleName = this.getModuleName(token);
				if (!moduleName) {
					return false;
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
				return true;
			},

			/**
			 * Generates module unique id base on module name and current state.
			 * @protected
			 * @virtual
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
			 * @virtual
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
					if (!this.loadModuleFromHistoryState(token, immediateLoad)) {
						this.replaceHomePage();
					}
				}
			},

			/**
			 * ######### ####### ######### ### ######.
			 * @protected
			 * @virtual
			 */
			refreshCacheHash: function() {
				var currentHistoryState = this.sandbox.publish("GetHistoryState");
				if (currentHistoryState && currentHistoryState.hash && currentHistoryState.hash.historyState) {
					Terrasoft.DomainCache.setItem("lastHash", currentHistoryState.hash.historyState);
				}
				this.currentHash.historyState = currentHistoryState.hash.historyState;
			},

			/**
			 * ######### ######## ########, #### ######### ## #### ############.
			 * @protected
			 * @virtual
			 */
			loadHomePage: function() {
				var state = this.sandbox.publish("GetHistoryState");
				var hash = state.hash;
				if (!hash.historyState) {
					this.openHomePage();
				} else if (hash.moduleName === "MainMenu") {
					this.replaceHomePage();
				}
			},

			/**
			 * ######### ######## ########.
			 * @protected
			 * @virtual
			 */
			openHomePage: function() {
				var hash = this.getHomePagePath();
				this.sandbox.publish("PushHistoryState", {hash: hash});
			},

			/**
			 * ######## ####### ######## ########.
			 * @private
			 */
			replaceHomePage: function() {
				var hash = this.getHomePagePath(true);
				this.sandbox.publish("ReplaceHistoryState", {hash: hash});
			},

			/**
			 * ########## #### # ######## ########.
			 * @protected
			 * @virtual
			 * @return {String} #### # ######## ########.
			 */
			getHomePagePath: function(ignoreLastHash) {
				var lastHash = Terrasoft.DomainCache.getItem("lastHash");
				if (lastHash && !ignoreLastHash) {
					return lastHash;
				}
				var module = this.Terrasoft.configuration.ModuleStructure[this.homeModule];
				return module ? this.Terrasoft.combinePath(module.sectionModule, module.sectionSchema) :
					this.getHomeModulePath();
			},

			/**
			 * ########## #### # ########## ######.
			 * @protected
			 * @virtual
			 * @return {String} #### # ########## ######.
			 */
			getHomeModulePath: function() {
				return this.homeModule;
			}
		});

		return Terrasoft.BaseViewModule;

	});


