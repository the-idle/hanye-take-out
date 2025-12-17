if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global2 = uni.requireGlobal();
  ArrayBuffer = global2.ArrayBuffer;
  Int8Array = global2.Int8Array;
  Uint8Array = global2.Uint8Array;
  Uint8ClampedArray = global2.Uint8ClampedArray;
  Int16Array = global2.Int16Array;
  Uint16Array = global2.Uint16Array;
  Int32Array = global2.Int32Array;
  Uint32Array = global2.Uint32Array;
  Float32Array = global2.Float32Array;
  Float64Array = global2.Float64Array;
  BigInt64Array = global2.BigInt64Array;
  BigUint64Array = global2.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  const ON_SHOW = "onShow";
  const ON_HIDE = "onHide";
  const ON_LAUNCH = "onLaunch";
  const ON_LOAD = "onLoad";
  const ON_UNLOAD = "onUnload";
  const ON_REACH_BOTTOM = "onReachBottom";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  function resolveEasycom(component, easycom) {
    return typeof component === "string" ? easycom : component;
  }
  const createHook = (lifecycle) => (hook, target = vue.getCurrentInstance()) => {
    !vue.isInSSRComponentSetup && vue.injectHook(lifecycle, hook, target);
  };
  const onShow = /* @__PURE__ */ createHook(ON_SHOW);
  const onHide = /* @__PURE__ */ createHook(ON_HIDE);
  const onLaunch = /* @__PURE__ */ createHook(ON_LAUNCH);
  const onLoad = /* @__PURE__ */ createHook(ON_LOAD);
  const onUnload = /* @__PURE__ */ createHook(ON_UNLOAD);
  const onReachBottom = /* @__PURE__ */ createHook(ON_REACH_BOTTOM);
  var isVue2 = false;
  function set$1(target, key, val) {
    if (Array.isArray(target)) {
      target.length = Math.max(target.length, key);
      target.splice(key, 1, val);
      return val;
    }
    target[key] = val;
    return val;
  }
  function del(target, key) {
    if (Array.isArray(target)) {
      target.splice(key, 1);
      return;
    }
    delete target[key];
  }
  function getDevtoolsGlobalHook() {
    return getTarget().__VUE_DEVTOOLS_GLOBAL_HOOK__;
  }
  function getTarget() {
    return typeof navigator !== "undefined" && typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : {};
  }
  const isProxyAvailable = typeof Proxy === "function";
  const HOOK_SETUP = "devtools-plugin:setup";
  const HOOK_PLUGIN_SETTINGS_SET = "plugin:settings:set";
  let supported;
  let perf;
  function isPerformanceSupported() {
    var _a;
    if (supported !== void 0) {
      return supported;
    }
    if (typeof window !== "undefined" && window.performance) {
      supported = true;
      perf = window.performance;
    } else if (typeof globalThis !== "undefined" && ((_a = globalThis.perf_hooks) === null || _a === void 0 ? void 0 : _a.performance)) {
      supported = true;
      perf = globalThis.perf_hooks.performance;
    } else {
      supported = false;
    }
    return supported;
  }
  function now() {
    return isPerformanceSupported() ? perf.now() : Date.now();
  }
  class ApiProxy {
    constructor(plugin, hook) {
      this.target = null;
      this.targetQueue = [];
      this.onQueue = [];
      this.plugin = plugin;
      this.hook = hook;
      const defaultSettings = {};
      if (plugin.settings) {
        for (const id in plugin.settings) {
          const item = plugin.settings[id];
          defaultSettings[id] = item.defaultValue;
        }
      }
      const localSettingsSaveId = `__vue-devtools-plugin-settings__${plugin.id}`;
      let currentSettings = Object.assign({}, defaultSettings);
      try {
        const raw = localStorage.getItem(localSettingsSaveId);
        const data = JSON.parse(raw);
        Object.assign(currentSettings, data);
      } catch (e) {
      }
      this.fallbacks = {
        getSettings() {
          return currentSettings;
        },
        setSettings(value) {
          try {
            localStorage.setItem(localSettingsSaveId, JSON.stringify(value));
          } catch (e) {
          }
          currentSettings = value;
        },
        now() {
          return now();
        }
      };
      if (hook) {
        hook.on(HOOK_PLUGIN_SETTINGS_SET, (pluginId, value) => {
          if (pluginId === this.plugin.id) {
            this.fallbacks.setSettings(value);
          }
        });
      }
      this.proxiedOn = new Proxy({}, {
        get: (_target, prop) => {
          if (this.target) {
            return this.target.on[prop];
          } else {
            return (...args) => {
              this.onQueue.push({
                method: prop,
                args
              });
            };
          }
        }
      });
      this.proxiedTarget = new Proxy({}, {
        get: (_target, prop) => {
          if (this.target) {
            return this.target[prop];
          } else if (prop === "on") {
            return this.proxiedOn;
          } else if (Object.keys(this.fallbacks).includes(prop)) {
            return (...args) => {
              this.targetQueue.push({
                method: prop,
                args,
                resolve: () => {
                }
              });
              return this.fallbacks[prop](...args);
            };
          } else {
            return (...args) => {
              return new Promise((resolve) => {
                this.targetQueue.push({
                  method: prop,
                  args,
                  resolve
                });
              });
            };
          }
        }
      });
    }
    async setRealTarget(target) {
      this.target = target;
      for (const item of this.onQueue) {
        this.target.on[item.method](...item.args);
      }
      for (const item of this.targetQueue) {
        item.resolve(await this.target[item.method](...item.args));
      }
    }
  }
  function setupDevtoolsPlugin(pluginDescriptor, setupFn) {
    const descriptor = pluginDescriptor;
    const target = getTarget();
    const hook = getDevtoolsGlobalHook();
    const enableProxy = isProxyAvailable && descriptor.enableEarlyProxy;
    if (hook && (target.__VUE_DEVTOOLS_PLUGIN_API_AVAILABLE__ || !enableProxy)) {
      hook.emit(HOOK_SETUP, pluginDescriptor, setupFn);
    } else {
      const proxy = enableProxy ? new ApiProxy(descriptor, hook) : null;
      const list = target.__VUE_DEVTOOLS_PLUGINS__ = target.__VUE_DEVTOOLS_PLUGINS__ || [];
      list.push({
        pluginDescriptor: descriptor,
        setupFn,
        proxy
      });
      if (proxy) {
        setupFn(proxy.proxiedTarget);
      }
    }
  }
  /*!
    * pinia v2.0.3
    * (c) 2021 Eduardo San Martin Morote
    * @license MIT
    */
  let activePinia;
  const setActivePinia = (pinia2) => activePinia = pinia2;
  const piniaSymbol = Symbol("pinia");
  function isPlainObject(o) {
    return o && typeof o === "object" && Object.prototype.toString.call(o) === "[object Object]" && typeof o.toJSON !== "function";
  }
  var MutationType;
  (function(MutationType2) {
    MutationType2["direct"] = "direct";
    MutationType2["patchObject"] = "patch object";
    MutationType2["patchFunction"] = "patch function";
  })(MutationType || (MutationType = {}));
  const IS_CLIENT = typeof window !== "undefined";
  const _global = /* @__PURE__ */ (() => typeof window === "object" && window.window === window ? window : typeof self === "object" && self.self === self ? self : typeof global === "object" && global.global === global ? global : typeof globalThis === "object" ? globalThis : { HTMLElement: null })();
  function bom(blob, { autoBom = false } = {}) {
    if (autoBom && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
      return new Blob([String.fromCharCode(65279), blob], { type: blob.type });
    }
    return blob;
  }
  function download(url, name, opts) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.onload = function() {
      saveAs(xhr.response, name, opts);
    };
    xhr.onerror = function() {
      console.error("could not download file");
    };
    xhr.send();
  }
  function corsEnabled(url) {
    const xhr = new XMLHttpRequest();
    xhr.open("HEAD", url, false);
    try {
      xhr.send();
    } catch (e) {
    }
    return xhr.status >= 200 && xhr.status <= 299;
  }
  function click(node) {
    try {
      node.dispatchEvent(new MouseEvent("click"));
    } catch (e) {
      const evt = document.createEvent("MouseEvents");
      evt.initMouseEvent("click", true, true, window, 0, 0, 0, 80, 20, false, false, false, false, 0, null);
      node.dispatchEvent(evt);
    }
  }
  const _navigator = typeof navigator === "object" ? navigator : { userAgent: "" };
  const isMacOSWebView = /* @__PURE__ */ (() => /Macintosh/.test(_navigator.userAgent) && /AppleWebKit/.test(_navigator.userAgent) && !/Safari/.test(_navigator.userAgent))();
  const saveAs = !IS_CLIENT ? () => {
  } : (
    // Use download attribute first if possible (#193 Lumia mobile) unless this is a macOS WebView
    "download" in HTMLAnchorElement.prototype && !isMacOSWebView ? downloadSaveAs : (
      // Use msSaveOrOpenBlob as a second approach
      "msSaveOrOpenBlob" in _navigator ? msSaveAs : (
        // Fallback to using FileReader and a popup
        fileSaverSaveAs
      )
    )
  );
  function downloadSaveAs(blob, name = "download", opts) {
    const a = document.createElement("a");
    a.download = name;
    a.rel = "noopener";
    if (typeof blob === "string") {
      a.href = blob;
      if (a.origin !== location.origin) {
        if (corsEnabled(a.href)) {
          download(blob, name, opts);
        } else {
          a.target = "_blank";
          click(a);
        }
      } else {
        click(a);
      }
    } else {
      a.href = URL.createObjectURL(blob);
      setTimeout(function() {
        URL.revokeObjectURL(a.href);
      }, 4e4);
      setTimeout(function() {
        click(a);
      }, 0);
    }
  }
  function msSaveAs(blob, name = "download", opts) {
    if (typeof blob === "string") {
      if (corsEnabled(blob)) {
        download(blob, name, opts);
      } else {
        const a = document.createElement("a");
        a.href = blob;
        a.target = "_blank";
        setTimeout(function() {
          click(a);
        });
      }
    } else {
      navigator.msSaveOrOpenBlob(bom(blob, opts), name);
    }
  }
  function fileSaverSaveAs(blob, name, opts, popup) {
    popup = popup || open("", "_blank");
    if (popup) {
      popup.document.title = popup.document.body.innerText = "downloading...";
    }
    if (typeof blob === "string")
      return download(blob, name, opts);
    const force = blob.type === "application/octet-stream";
    const isSafari = /constructor/i.test(String(_global.HTMLElement)) || "safari" in _global;
    const isChromeIOS = /CriOS\/[\d]+/.test(navigator.userAgent);
    if ((isChromeIOS || force && isSafari || isMacOSWebView) && typeof FileReader !== "undefined") {
      const reader = new FileReader();
      reader.onloadend = function() {
        let url = reader.result;
        if (typeof url !== "string") {
          popup = null;
          throw new Error("Wrong reader.result type");
        }
        url = isChromeIOS ? url : url.replace(/^data:[^;]*;/, "data:attachment/file;");
        if (popup) {
          popup.location.href = url;
        } else {
          location.assign(url);
        }
        popup = null;
      };
      reader.readAsDataURL(blob);
    } else {
      const url = URL.createObjectURL(blob);
      if (popup)
        popup.location.assign(url);
      else
        location.href = url;
      popup = null;
      setTimeout(function() {
        URL.revokeObjectURL(url);
      }, 4e4);
    }
  }
  function toastMessage(message, type) {
    const piniaMessage = "🍍 " + message;
    if (typeof __VUE_DEVTOOLS_TOAST__ === "function") {
      __VUE_DEVTOOLS_TOAST__(piniaMessage, type);
    } else if (type === "error") {
      console.error(piniaMessage);
    } else if (type === "warn") {
      console.warn(piniaMessage);
    } else {
      console.log(piniaMessage);
    }
  }
  function isPinia(o) {
    return "_a" in o && "install" in o;
  }
  function checkClipboardAccess() {
    if (!("clipboard" in navigator)) {
      toastMessage(`Your browser doesn't support the Clipboard API`, "error");
      return true;
    }
  }
  function checkNotFocusedError(error) {
    if (error instanceof Error && error.message.toLowerCase().includes("document is not focused")) {
      toastMessage('You need to activate the "Emulate a focused page" setting in the "Rendering" panel of devtools.', "warn");
      return true;
    }
    return false;
  }
  async function actionGlobalCopyState(pinia2) {
    if (checkClipboardAccess())
      return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(pinia2.state.value));
      toastMessage("Global state copied to clipboard.");
    } catch (error) {
      if (checkNotFocusedError(error))
        return;
      toastMessage(`Failed to serialize the state. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  async function actionGlobalPasteState(pinia2) {
    if (checkClipboardAccess())
      return;
    try {
      pinia2.state.value = JSON.parse(await navigator.clipboard.readText());
      toastMessage("Global state pasted from clipboard.");
    } catch (error) {
      if (checkNotFocusedError(error))
        return;
      toastMessage(`Failed to deserialize the state from clipboard. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  async function actionGlobalSaveState(pinia2) {
    try {
      saveAs(new Blob([JSON.stringify(pinia2.state.value)], {
        type: "text/plain;charset=utf-8"
      }), "pinia-state.json");
    } catch (error) {
      toastMessage(`Failed to export the state as JSON. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  let fileInput;
  function getFileOpener() {
    if (!fileInput) {
      fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json";
    }
    function openFile() {
      return new Promise((resolve, reject) => {
        fileInput.onchange = async () => {
          const files = fileInput.files;
          if (!files)
            return resolve(null);
          const file = files.item(0);
          if (!file)
            return resolve(null);
          return resolve({ text: await file.text(), file });
        };
        fileInput.oncancel = () => resolve(null);
        fileInput.onerror = reject;
        fileInput.click();
      });
    }
    return openFile;
  }
  async function actionGlobalOpenStateFile(pinia2) {
    try {
      const open2 = await getFileOpener();
      const result = await open2();
      if (!result)
        return;
      const { text, file } = result;
      pinia2.state.value = JSON.parse(text);
      toastMessage(`Global state imported from "${file.name}".`);
    } catch (error) {
      toastMessage(`Failed to export the state as JSON. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  function formatDisplay(display) {
    return {
      _custom: {
        display
      }
    };
  }
  const PINIA_ROOT_LABEL = "🍍 Pinia (root)";
  const PINIA_ROOT_ID = "_root";
  function formatStoreForInspectorTree(store) {
    return "$id" in store ? {
      id: store.$id,
      label: store.$id
    } : {
      id: PINIA_ROOT_ID,
      label: PINIA_ROOT_LABEL
    };
  }
  function formatStoreForInspectorState(store) {
    if (isPinia(store)) {
      const state2 = {
        state: Object.keys(store.state.value).map((storeId) => ({
          editable: true,
          key: storeId,
          value: store.state.value[storeId]
        }))
      };
      return state2;
    }
    const state = {
      state: Object.keys(store.$state).map((key) => ({
        editable: true,
        key,
        value: store.$state[key]
      }))
    };
    if (store._getters && store._getters.length) {
      state.getters = store._getters.map((getterName) => ({
        editable: false,
        key: getterName,
        value: store[getterName]
      }));
    }
    if (store._customProperties.size) {
      state.customProperties = Array.from(store._customProperties).map((key) => ({
        editable: true,
        key,
        value: store[key]
      }));
    }
    return state;
  }
  function formatEventData(events) {
    if (!events)
      return {};
    if (Array.isArray(events)) {
      return events.reduce((data, event) => {
        data.keys.push(event.key);
        data.operations.push(event.type);
        data.oldValue[event.key] = event.oldValue;
        data.newValue[event.key] = event.newValue;
        return data;
      }, {
        oldValue: {},
        keys: [],
        operations: [],
        newValue: {}
      });
    } else {
      return {
        operation: formatDisplay(events.type),
        key: formatDisplay(events.key),
        oldValue: events.oldValue,
        newValue: events.newValue
      };
    }
  }
  function formatMutationType(type) {
    switch (type) {
      case MutationType.direct:
        return "mutation";
      case MutationType.patchFunction:
        return "$patch";
      case MutationType.patchObject:
        return "$patch";
      default:
        return "unknown";
    }
  }
  let isTimelineActive = true;
  const componentStateTypes = [];
  const MUTATIONS_LAYER_ID = "pinia:mutations";
  const INSPECTOR_ID = "pinia";
  const getStoreType = (id) => "🍍 " + id;
  function registerPiniaDevtools(app, pinia2) {
    setupDevtoolsPlugin({
      id: "dev.esm.pinia",
      label: "Pinia 🍍",
      logo: "https://pinia.esm.dev/logo.svg",
      packageName: "pinia",
      homepage: "https://pinia.esm.dev",
      componentStateTypes,
      app
    }, (api) => {
      api.addTimelineLayer({
        id: MUTATIONS_LAYER_ID,
        label: `Pinia 🍍`,
        color: 15064968
      });
      api.addInspector({
        id: INSPECTOR_ID,
        label: "Pinia 🍍",
        icon: "storage",
        treeFilterPlaceholder: "Search stores",
        actions: [
          {
            icon: "content_copy",
            action: () => {
              actionGlobalCopyState(pinia2);
            },
            tooltip: "Serialize and copy the state"
          },
          {
            icon: "content_paste",
            action: async () => {
              await actionGlobalPasteState(pinia2);
              api.sendInspectorTree(INSPECTOR_ID);
              api.sendInspectorState(INSPECTOR_ID);
            },
            tooltip: "Replace the state with the content of your clipboard"
          },
          {
            icon: "save",
            action: () => {
              actionGlobalSaveState(pinia2);
            },
            tooltip: "Save the state as a JSON file"
          },
          {
            icon: "folder_open",
            action: async () => {
              await actionGlobalOpenStateFile(pinia2);
              api.sendInspectorTree(INSPECTOR_ID);
              api.sendInspectorState(INSPECTOR_ID);
            },
            tooltip: "Import the state from a JSON file"
          }
        ]
      });
      api.on.inspectComponent((payload, ctx) => {
        const proxy = payload.componentInstance && payload.componentInstance.proxy;
        if (proxy && proxy._pStores) {
          const piniaStores = payload.componentInstance.proxy._pStores;
          Object.values(piniaStores).forEach((store) => {
            payload.instanceData.state.push({
              type: getStoreType(store.$id),
              key: "state",
              editable: true,
              value: store.$state
            });
            if (store._getters && store._getters.length) {
              payload.instanceData.state.push({
                type: getStoreType(store.$id),
                key: "getters",
                editable: false,
                value: store._getters.reduce((getters, key) => {
                  getters[key] = store[key];
                  return getters;
                }, {})
              });
            }
          });
        }
      });
      api.on.getInspectorTree((payload) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          let stores = [pinia2];
          stores = stores.concat(Array.from(pinia2._s.values()));
          payload.rootNodes = (payload.filter ? stores.filter((store) => "$id" in store ? store.$id.toLowerCase().includes(payload.filter.toLowerCase()) : PINIA_ROOT_LABEL.toLowerCase().includes(payload.filter.toLowerCase())) : stores).map(formatStoreForInspectorTree);
        }
      });
      api.on.getInspectorState((payload) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          const inspectedStore = payload.nodeId === PINIA_ROOT_ID ? pinia2 : pinia2._s.get(payload.nodeId);
          if (!inspectedStore) {
            return;
          }
          if (inspectedStore) {
            payload.state = formatStoreForInspectorState(inspectedStore);
          }
        }
      });
      api.on.editInspectorState((payload, ctx) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          const inspectedStore = payload.nodeId === PINIA_ROOT_ID ? pinia2 : pinia2._s.get(payload.nodeId);
          if (!inspectedStore) {
            return toastMessage(`store "${payload.nodeId}" not found`, "error");
          }
          const { path } = payload;
          if (!isPinia(inspectedStore)) {
            if (path.length !== 1 || !inspectedStore._customProperties.has(path[0]) || path[0] in inspectedStore.$state) {
              path.unshift("$state");
            }
          } else {
            path.unshift("state");
          }
          isTimelineActive = false;
          payload.set(inspectedStore, path, payload.state.value);
          isTimelineActive = true;
        }
      });
      api.on.editComponentState((payload) => {
        if (payload.type.startsWith("🍍")) {
          const storeId = payload.type.replace(/^🍍\s*/, "");
          const store = pinia2._s.get(storeId);
          if (!store) {
            return toastMessage(`store "${storeId}" not found`, "error");
          }
          const { path } = payload;
          if (path[0] !== "state") {
            return toastMessage(`Invalid path for store "${storeId}":
${path}
Only state can be modified.`);
          }
          path[0] = "$state";
          isTimelineActive = false;
          payload.set(store, path, payload.state.value);
          isTimelineActive = true;
        }
      });
    });
  }
  function addStoreToDevtools(app, store) {
    if (!componentStateTypes.includes(getStoreType(store.$id))) {
      componentStateTypes.push(getStoreType(store.$id));
    }
    setupDevtoolsPlugin({
      id: "dev.esm.pinia",
      label: "Pinia 🍍",
      logo: "https://pinia.esm.dev/logo.svg",
      packageName: "pinia",
      homepage: "https://pinia.esm.dev",
      componentStateTypes,
      app
    }, (api) => {
      store.$onAction(({ after, onError, name, args }) => {
        const groupId = runningActionId++;
        api.addTimelineEvent({
          layerId: MUTATIONS_LAYER_ID,
          event: {
            time: Date.now(),
            title: "🛫 " + name,
            subtitle: "start",
            data: {
              store: formatDisplay(store.$id),
              action: formatDisplay(name),
              args
            },
            groupId
          }
        });
        after((result) => {
          activeAction = void 0;
          api.addTimelineEvent({
            layerId: MUTATIONS_LAYER_ID,
            event: {
              time: Date.now(),
              title: "🛬 " + name,
              subtitle: "end",
              data: {
                store: formatDisplay(store.$id),
                action: formatDisplay(name),
                args,
                result
              },
              groupId
            }
          });
        });
        onError((error) => {
          activeAction = void 0;
          api.addTimelineEvent({
            layerId: MUTATIONS_LAYER_ID,
            event: {
              time: Date.now(),
              logType: "error",
              title: "💥 " + name,
              subtitle: "end",
              data: {
                store: formatDisplay(store.$id),
                action: formatDisplay(name),
                args,
                error
              },
              groupId
            }
          });
        });
      }, true);
      store._customProperties.forEach((name) => {
        vue.watch(() => vue.unref(store[name]), (newValue, oldValue) => {
          api.notifyComponentUpdate();
          api.sendInspectorState(INSPECTOR_ID);
          if (isTimelineActive) {
            api.addTimelineEvent({
              layerId: MUTATIONS_LAYER_ID,
              event: {
                time: Date.now(),
                title: "Change",
                subtitle: name,
                data: {
                  newValue,
                  oldValue
                },
                groupId: activeAction
              }
            });
          }
        }, { deep: true });
      });
      store.$subscribe(({ events, type }, state) => {
        api.notifyComponentUpdate();
        api.sendInspectorState(INSPECTOR_ID);
        if (!isTimelineActive)
          return;
        const eventData = {
          time: Date.now(),
          title: formatMutationType(type),
          data: {
            store: formatDisplay(store.$id),
            ...formatEventData(events)
          },
          groupId: activeAction
        };
        activeAction = void 0;
        if (type === MutationType.patchFunction) {
          eventData.subtitle = "⤵️";
        } else if (type === MutationType.patchObject) {
          eventData.subtitle = "🧩";
        } else if (events && !Array.isArray(events)) {
          eventData.subtitle = events.type;
        }
        if (events) {
          eventData.data["rawEvent(s)"] = {
            _custom: {
              display: "DebuggerEvent",
              type: "object",
              tooltip: "raw DebuggerEvent[]",
              value: events
            }
          };
        }
        api.addTimelineEvent({
          layerId: MUTATIONS_LAYER_ID,
          event: eventData
        });
      }, { detached: true, flush: "sync" });
      const hotUpdate = store._hotUpdate;
      store._hotUpdate = vue.markRaw((newStore) => {
        hotUpdate(newStore);
        api.addTimelineEvent({
          layerId: MUTATIONS_LAYER_ID,
          event: {
            time: Date.now(),
            title: "🔥 " + store.$id,
            subtitle: "HMR update",
            data: {
              store: formatDisplay(store.$id),
              info: formatDisplay(`HMR update`)
            }
          }
        });
        api.notifyComponentUpdate();
        api.sendInspectorTree(INSPECTOR_ID);
        api.sendInspectorState(INSPECTOR_ID);
      });
      const { $dispose } = store;
      store.$dispose = () => {
        $dispose();
        api.notifyComponentUpdate();
        api.sendInspectorTree(INSPECTOR_ID);
        api.sendInspectorState(INSPECTOR_ID);
        toastMessage(`Disposed "${store.$id}" store 🗑`);
      };
      api.notifyComponentUpdate();
      api.sendInspectorTree(INSPECTOR_ID);
      api.sendInspectorState(INSPECTOR_ID);
      toastMessage(`"${store.$id}" store installed 🆕`);
    });
  }
  let runningActionId = 0;
  let activeAction;
  function patchActionForGrouping(store, actionNames) {
    const actions = actionNames.reduce((storeActions, actionName) => {
      storeActions[actionName] = vue.toRaw(store)[actionName];
      return storeActions;
    }, {});
    for (const actionName in actions) {
      store[actionName] = function() {
        const _actionId = runningActionId;
        const trackedStore = new Proxy(store, {
          get(...args) {
            activeAction = _actionId;
            return Reflect.get(...args);
          },
          set(...args) {
            activeAction = _actionId;
            return Reflect.set(...args);
          }
        });
        return actions[actionName].apply(trackedStore, arguments);
      };
    }
  }
  function devtoolsPlugin({ app, store, options }) {
    if (store.$id.startsWith("__hot:")) {
      return;
    }
    if (typeof options.state === "function") {
      patchActionForGrouping(
        // @ts-expect-error: can cast the store...
        store,
        Object.keys(options.actions)
      );
      const originalHotUpdate = store._hotUpdate;
      vue.toRaw(store)._hotUpdate = function(newStore) {
        originalHotUpdate.apply(this, arguments);
        patchActionForGrouping(store, Object.keys(newStore._hmrPayload.actions));
      };
    }
    addStoreToDevtools(
      // @ts-expect-error: should be of type App from vue
      app,
      // FIXME: is there a way to allow the assignment from Store<Id, S, G, A> to StoreGeneric?
      store
    );
  }
  function createPinia() {
    const scope = vue.effectScope(true);
    const state = scope.run(() => vue.ref({}));
    let _p = [];
    let toBeInstalled = [];
    const pinia2 = vue.markRaw({
      install(app) {
        setActivePinia(pinia2);
        {
          pinia2._a = app;
          app.provide(piniaSymbol, pinia2);
          app.config.globalProperties.$pinia = pinia2;
          if (IS_CLIENT) {
            registerPiniaDevtools(app, pinia2);
          }
          toBeInstalled.forEach((plugin) => _p.push(plugin));
          toBeInstalled = [];
        }
      },
      use(plugin) {
        if (!this._a && !isVue2) {
          toBeInstalled.push(plugin);
        } else {
          _p.push(plugin);
        }
        return this;
      },
      _p,
      // it's actually undefined here
      // @ts-expect-error
      _a: null,
      _e: scope,
      _s: /* @__PURE__ */ new Map(),
      state
    });
    if (IS_CLIENT) {
      pinia2.use(devtoolsPlugin);
    }
    return pinia2;
  }
  function patchObject(newState, oldState) {
    for (const key in oldState) {
      const subPatch = oldState[key];
      if (!(key in newState)) {
        continue;
      }
      const targetValue = newState[key];
      if (isPlainObject(targetValue) && isPlainObject(subPatch) && !vue.isRef(subPatch) && !vue.isReactive(subPatch)) {
        newState[key] = patchObject(targetValue, subPatch);
      } else {
        {
          newState[key] = subPatch;
        }
      }
    }
    return newState;
  }
  function addSubscription(subscriptions, callback, detached) {
    subscriptions.push(callback);
    const removeSubscription = () => {
      const idx = subscriptions.indexOf(callback);
      if (idx > -1) {
        subscriptions.splice(idx, 1);
      }
    };
    if (!detached && vue.getCurrentInstance()) {
      vue.onUnmounted(removeSubscription);
    }
    return removeSubscription;
  }
  function triggerSubscriptions(subscriptions, ...args) {
    subscriptions.forEach((callback) => {
      callback(...args);
    });
  }
  function mergeReactiveObjects(target, patchToApply) {
    for (const key in patchToApply) {
      const subPatch = patchToApply[key];
      const targetValue = target[key];
      if (isPlainObject(targetValue) && isPlainObject(subPatch) && !vue.isRef(subPatch) && !vue.isReactive(subPatch)) {
        target[key] = mergeReactiveObjects(targetValue, subPatch);
      } else {
        target[key] = subPatch;
      }
    }
    return target;
  }
  const skipHydrateSymbol = Symbol("pinia:skipHydration");
  function shouldHydrate(obj) {
    return !isPlainObject(obj) || !obj.hasOwnProperty(skipHydrateSymbol);
  }
  const { assign } = Object;
  function isComputed(o) {
    return !!(vue.isRef(o) && o.effect);
  }
  function createOptionsStore(id, options, pinia2, hot) {
    const { state, actions, getters } = options;
    const initialState = pinia2.state.value[id];
    let store;
    function setup() {
      if (!initialState && !hot) {
        {
          pinia2.state.value[id] = state ? state() : {};
        }
      }
      const localState = hot ? (
        // use ref() to unwrap refs inside state TODO: check if this is still necessary
        vue.toRefs(vue.ref(state ? state() : {}).value)
      ) : vue.toRefs(pinia2.state.value[id]);
      return assign(localState, actions, Object.keys(getters || {}).reduce((computedGetters, name) => {
        computedGetters[name] = vue.markRaw(vue.computed(() => {
          setActivePinia(pinia2);
          const store2 = pinia2._s.get(id);
          return getters[name].call(store2, store2);
        }));
        return computedGetters;
      }, {}));
    }
    store = createSetupStore(id, setup, options, pinia2, hot);
    store.$reset = function $reset() {
      const newState = state ? state() : {};
      this.$patch(($state) => {
        assign($state, newState);
      });
    };
    return store;
  }
  const noop = () => {
  };
  function createSetupStore($id, setup, options = {}, pinia2, hot) {
    let scope;
    const buildState = options.state;
    const optionsForPlugin = assign({ actions: {} }, options);
    if (!pinia2._e.active) {
      throw new Error("Pinia destroyed");
    }
    const $subscribeOptions = {
      deep: true
      // flush: 'post',
    };
    {
      $subscribeOptions.onTrigger = (event) => {
        if (isListening) {
          debuggerEvents = event;
        } else if (isListening == false && !store._hotUpdating) {
          if (Array.isArray(debuggerEvents)) {
            debuggerEvents.push(event);
          } else {
            console.error("🍍 debuggerEvents should be an array. This is most likely an internal Pinia bug.");
          }
        }
      };
    }
    let isListening;
    let subscriptions = vue.markRaw([]);
    let actionSubscriptions = vue.markRaw([]);
    let debuggerEvents;
    const initialState = pinia2.state.value[$id];
    if (!buildState && !initialState && !hot) {
      {
        pinia2.state.value[$id] = {};
      }
    }
    const hotState = vue.ref({});
    function $patch(partialStateOrMutator) {
      let subscriptionMutation;
      isListening = false;
      {
        debuggerEvents = [];
      }
      if (typeof partialStateOrMutator === "function") {
        partialStateOrMutator(pinia2.state.value[$id]);
        subscriptionMutation = {
          type: MutationType.patchFunction,
          storeId: $id,
          events: debuggerEvents
        };
      } else {
        mergeReactiveObjects(pinia2.state.value[$id], partialStateOrMutator);
        subscriptionMutation = {
          type: MutationType.patchObject,
          payload: partialStateOrMutator,
          storeId: $id,
          events: debuggerEvents
        };
      }
      isListening = true;
      triggerSubscriptions(subscriptions, subscriptionMutation, pinia2.state.value[$id]);
    }
    const $reset = () => {
      throw new Error(`🍍: Store "${$id}" is build using the setup syntax and does not implement $reset().`);
    };
    function $dispose() {
      scope.stop();
      subscriptions = [];
      actionSubscriptions = [];
      pinia2._s.delete($id);
    }
    function wrapAction(name, action) {
      return function() {
        setActivePinia(pinia2);
        const args = Array.from(arguments);
        let afterCallback = noop;
        let onErrorCallback = noop;
        function after(callback) {
          afterCallback = callback;
        }
        function onError(callback) {
          onErrorCallback = callback;
        }
        triggerSubscriptions(actionSubscriptions, {
          args,
          name,
          store,
          after,
          onError
        });
        let ret;
        try {
          ret = action.apply(this && this.$id === $id ? this : store, args);
        } catch (error) {
          if (onErrorCallback(error) !== false) {
            throw error;
          }
        }
        if (ret instanceof Promise) {
          return ret.then((value) => {
            const newRet2 = afterCallback(value);
            return newRet2 === void 0 ? value : newRet2;
          }).catch((error) => {
            if (onErrorCallback(error) !== false) {
              return Promise.reject(error);
            }
          });
        }
        const newRet = afterCallback(ret);
        return newRet === void 0 ? ret : newRet;
      };
    }
    const _hmrPayload = /* @__PURE__ */ vue.markRaw({
      actions: {},
      getters: {},
      state: [],
      hotState
    });
    const partialStore = {
      _p: pinia2,
      // _s: scope,
      $id,
      $onAction: addSubscription.bind(null, actionSubscriptions),
      $patch,
      $reset,
      $subscribe(callback, options2 = {}) {
        const _removeSubscription = addSubscription(subscriptions, callback, options2.detached);
        const stopWatcher = scope.run(() => vue.watch(() => pinia2.state.value[$id], (state) => {
          if (isListening) {
            callback({
              storeId: $id,
              type: MutationType.direct,
              events: debuggerEvents
            }, state);
          }
        }, assign({}, $subscribeOptions, options2)));
        const removeSubscription = () => {
          stopWatcher();
          _removeSubscription();
        };
        return removeSubscription;
      },
      $dispose
    };
    const store = vue.reactive(assign(
      IS_CLIENT ? (
        // devtools custom properties
        {
          _customProperties: vue.markRaw(/* @__PURE__ */ new Set()),
          _hmrPayload
        }
      ) : {},
      partialStore
      // must be added later
      // setupStore
    ));
    pinia2._s.set($id, store);
    const setupStore = pinia2._e.run(() => {
      scope = vue.effectScope();
      return scope.run(() => setup());
    });
    for (const key in setupStore) {
      const prop = setupStore[key];
      if (vue.isRef(prop) && !isComputed(prop) || vue.isReactive(prop)) {
        if (hot) {
          set$1(hotState.value, key, vue.toRef(setupStore, key));
        } else if (!buildState) {
          if (initialState && shouldHydrate(prop)) {
            if (vue.isRef(prop)) {
              prop.value = initialState[key];
            } else {
              mergeReactiveObjects(prop, initialState[key]);
            }
          }
          {
            pinia2.state.value[$id][key] = prop;
          }
        }
        {
          _hmrPayload.state.push(key);
        }
      } else if (typeof prop === "function") {
        const actionValue = hot ? prop : wrapAction(key, prop);
        {
          setupStore[key] = actionValue;
        }
        {
          _hmrPayload.actions[key] = prop;
        }
        optionsForPlugin.actions[key] = prop;
      } else {
        if (isComputed(prop)) {
          _hmrPayload.getters[key] = buildState ? (
            // @ts-expect-error
            options.getters[key]
          ) : prop;
          if (IS_CLIENT) {
            const getters = (
              // @ts-expect-error: it should be on the store
              setupStore._getters || (setupStore._getters = vue.markRaw([]))
            );
            getters.push(key);
          }
        }
      }
    }
    {
      assign(store, setupStore);
    }
    Object.defineProperty(store, "$state", {
      get: () => hot ? hotState.value : pinia2.state.value[$id],
      set: (state) => {
        if (hot) {
          throw new Error("cannot set hotState");
        }
        $patch(($state) => {
          assign($state, state);
        });
      }
    });
    {
      store._hotUpdate = vue.markRaw((newStore) => {
        store._hotUpdating = true;
        newStore._hmrPayload.state.forEach((stateKey) => {
          if (stateKey in store.$state) {
            const newStateTarget = newStore.$state[stateKey];
            const oldStateSource = store.$state[stateKey];
            if (typeof newStateTarget === "object" && isPlainObject(newStateTarget) && isPlainObject(oldStateSource)) {
              patchObject(newStateTarget, oldStateSource);
            } else {
              newStore.$state[stateKey] = oldStateSource;
            }
          }
          set$1(store, stateKey, vue.toRef(newStore.$state, stateKey));
        });
        Object.keys(store.$state).forEach((stateKey) => {
          if (!(stateKey in newStore.$state)) {
            del(store, stateKey);
          }
        });
        isListening = false;
        pinia2.state.value[$id] = vue.toRef(newStore._hmrPayload, "hotState");
        isListening = true;
        for (const actionName in newStore._hmrPayload.actions) {
          const action = newStore[actionName];
          set$1(store, actionName, wrapAction(actionName, action));
        }
        for (const getterName in newStore._hmrPayload.getters) {
          const getter = newStore._hmrPayload.getters[getterName];
          const getterValue = buildState ? (
            // special handling of options api
            vue.computed(() => {
              setActivePinia(pinia2);
              return getter.call(store, store);
            })
          ) : getter;
          set$1(store, getterName, getterValue);
        }
        Object.keys(store._hmrPayload.getters).forEach((key) => {
          if (!(key in newStore._hmrPayload.getters)) {
            del(store, key);
          }
        });
        Object.keys(store._hmrPayload.actions).forEach((key) => {
          if (!(key in newStore._hmrPayload.actions)) {
            del(store, key);
          }
        });
        store._hmrPayload = newStore._hmrPayload;
        store._getters = newStore._getters;
        store._hotUpdating = false;
      });
      const nonEnumerable = {
        writable: true,
        configurable: true,
        // avoid warning on devtools trying to display this property
        enumerable: false
      };
      if (IS_CLIENT) {
        ["_p", "_hmrPayload", "_getters", "_customProperties"].forEach((p) => {
          Object.defineProperty(store, p, {
            value: store[p],
            ...nonEnumerable
          });
        });
      }
    }
    pinia2._p.forEach((extender) => {
      if (IS_CLIENT) {
        const extensions = scope.run(() => extender({
          store,
          app: pinia2._a,
          pinia: pinia2,
          options: optionsForPlugin
        }));
        Object.keys(extensions || {}).forEach((key) => store._customProperties.add(key));
        assign(store, extensions);
      } else {
        assign(store, scope.run(() => extender({
          store,
          app: pinia2._a,
          pinia: pinia2,
          options: optionsForPlugin
        })));
      }
    });
    if (store.$state && typeof store.$state === "object" && typeof store.$state.constructor === "function" && !store.$state.constructor.toString().includes("[native code]")) {
      console.warn(`[🍍]: The "state" must be a plain object. It cannot be
	state: () => new MyClass()
Found in store "${store.$id}".`);
    }
    if (initialState && buildState && options.hydrate) {
      options.hydrate(store.$state, initialState);
    }
    isListening = true;
    return store;
  }
  function defineStore(idOrOptions, setup, setupOptions) {
    let id;
    let options;
    const isSetupStore = typeof setup === "function";
    if (typeof idOrOptions === "string") {
      id = idOrOptions;
      options = isSetupStore ? setupOptions : setup;
    } else {
      options = idOrOptions;
      id = idOrOptions.id;
    }
    function useStore(pinia2, hot) {
      const currentInstance = vue.getCurrentInstance();
      pinia2 = // in test mode, ignore the argument provided as we can always retrieve a
      // pinia instance with getActivePinia()
      pinia2 || currentInstance && vue.inject(piniaSymbol);
      if (pinia2)
        setActivePinia(pinia2);
      if (!activePinia) {
        throw new Error(`[🍍]: getActivePinia was called with no active Pinia. Did you forget to install pinia?
	const pinia = createPinia()
	app.use(pinia)
This will fail in production.`);
      }
      pinia2 = activePinia;
      if (!pinia2._s.has(id)) {
        if (isSetupStore) {
          createSetupStore(id, setup, options, pinia2);
        } else {
          createOptionsStore(id, options, pinia2);
        }
        {
          useStore._pinia = pinia2;
        }
      }
      const store = pinia2._s.get(id);
      if (hot) {
        const hotId = "__hot:" + id;
        const newStore = isSetupStore ? createSetupStore(hotId, setup, options, pinia2, true) : createOptionsStore(hotId, assign({}, options), pinia2, true);
        hot._hotUpdate(newStore);
        delete pinia2.state.value[hotId];
        pinia2._s.delete(hotId);
      }
      if (IS_CLIENT && currentInstance && currentInstance.proxy && // avoid adding stores that are just built for hot module replacement
      !hot) {
        const vm = currentInstance.proxy;
        const cache = "_pStores" in vm ? vm._pStores : vm._pStores = {};
        cache[id] = store;
      }
      return store;
    }
    useStore.$id = id;
    return useStore;
  }
  const useUserStore = defineStore(
    "member",
    () => {
      const profile = vue.ref();
      const setProfile = (val) => {
        profile.value = val;
      };
      const clearProfile = () => {
        profile.value = void 0;
      };
      return {
        profile,
        setProfile,
        clearProfile
      };
    },
    // 持久化
    {
      // 网页端配置
      // persist: true,
      // 小程序端配置
      persist: {
        storage: {
          getItem: (key) => uni.getStorageSync(key),
          setItem: (key, value) => uni.setStorageSync(key, value)
        }
      }
    }
  );
  const baseURL = "http://localhost:8081";
  const httpInterceptor = {
    // 拦截前触发
    invoke(options) {
      var _a;
      if (!options.url.startsWith("http")) {
        options.url = baseURL + options.url;
      }
      options.timeout = 1e4;
      options.header = {
        "source-client": "miniapp",
        ...options.header
      };
      const userStore = useUserStore();
      const token = (_a = userStore.profile) == null ? void 0 : _a.token;
      formatAppLog("log", "at utils/http.ts:24", "token", token);
      if (token) {
        options.header.Authorization = token;
      }
    }
  };
  uni.addInterceptor("request", httpInterceptor);
  const http = (options) => {
    return new Promise((resolve, reject) => {
      uni.request({
        ...options,
        // 响应成功
        success(res) {
          formatAppLog("log", "at utils/http.ts:50", "响应  ", res);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else if (res.statusCode === 401) {
            const userStore = useUserStore();
            userStore.clearProfile();
            uni.navigateTo({ url: "/pages/login/login" });
            reject(res);
          } else {
            uni.showToast({
              title: res.data.msg || "请求失败",
              icon: "none"
            });
          }
        },
        // 响应失败
        fail(err) {
          uni.showToast({
            title: "网络不行，换个试试？",
            icon: "none"
            // mask: true,
          });
          reject(err);
        }
      });
    });
  };
  const getStatusAPI = () => {
    return http({
      method: "GET",
      url: "/user/shop/status"
    });
  };
  const getShopConfigAPI = () => {
    return http({
      method: "GET",
      url: "/user/shop/config"
    });
  };
  const getCategoryAPI = () => {
    return http({
      method: "GET",
      url: "/user/category/list"
    });
  };
  const getDishListAPI = (id) => {
    return http({
      method: "GET",
      url: `/user/dish/list/${id}`
    });
  };
  const getDishByIdAPI = (id) => {
    return http({
      method: "GET",
      url: `/user/dish/${id}`
    });
  };
  const getSetmealListAPI = (id) => {
    return http({
      method: "GET",
      url: `/user/setmeal/list/${id}`
    });
  };
  const getSetmealAPI = (id) => {
    return http({
      method: "GET",
      url: `/user/setmeal/${id}`
    });
  };
  const addToCartAPI = (cartDTO) => {
    return http({
      method: "POST",
      url: "/user/cart/add",
      data: cartDTO
    });
  };
  const subCartAPI = (cartDTO) => {
    return http({
      method: "PUT",
      url: "/user/cart/sub",
      data: cartDTO
    });
  };
  const getCartAPI = () => {
    return http({
      method: "GET",
      url: "/user/cart/list"
    });
  };
  const cleanCartAPI = () => {
    return http({
      method: "DELETE",
      url: "/user/cart/clean"
    });
  };
  const fontData = [
    {
      "font_class": "arrow-down",
      "unicode": ""
    },
    {
      "font_class": "arrow-left",
      "unicode": ""
    },
    {
      "font_class": "arrow-right",
      "unicode": ""
    },
    {
      "font_class": "arrow-up",
      "unicode": ""
    },
    {
      "font_class": "auth",
      "unicode": ""
    },
    {
      "font_class": "auth-filled",
      "unicode": ""
    },
    {
      "font_class": "back",
      "unicode": ""
    },
    {
      "font_class": "bars",
      "unicode": ""
    },
    {
      "font_class": "calendar",
      "unicode": ""
    },
    {
      "font_class": "calendar-filled",
      "unicode": ""
    },
    {
      "font_class": "camera",
      "unicode": ""
    },
    {
      "font_class": "camera-filled",
      "unicode": ""
    },
    {
      "font_class": "cart",
      "unicode": ""
    },
    {
      "font_class": "cart-filled",
      "unicode": ""
    },
    {
      "font_class": "chat",
      "unicode": ""
    },
    {
      "font_class": "chat-filled",
      "unicode": ""
    },
    {
      "font_class": "chatboxes",
      "unicode": ""
    },
    {
      "font_class": "chatboxes-filled",
      "unicode": ""
    },
    {
      "font_class": "chatbubble",
      "unicode": ""
    },
    {
      "font_class": "chatbubble-filled",
      "unicode": ""
    },
    {
      "font_class": "checkbox",
      "unicode": ""
    },
    {
      "font_class": "checkbox-filled",
      "unicode": ""
    },
    {
      "font_class": "checkmarkempty",
      "unicode": ""
    },
    {
      "font_class": "circle",
      "unicode": ""
    },
    {
      "font_class": "circle-filled",
      "unicode": ""
    },
    {
      "font_class": "clear",
      "unicode": ""
    },
    {
      "font_class": "close",
      "unicode": ""
    },
    {
      "font_class": "closeempty",
      "unicode": ""
    },
    {
      "font_class": "cloud-download",
      "unicode": ""
    },
    {
      "font_class": "cloud-download-filled",
      "unicode": ""
    },
    {
      "font_class": "cloud-upload",
      "unicode": ""
    },
    {
      "font_class": "cloud-upload-filled",
      "unicode": ""
    },
    {
      "font_class": "color",
      "unicode": ""
    },
    {
      "font_class": "color-filled",
      "unicode": ""
    },
    {
      "font_class": "compose",
      "unicode": ""
    },
    {
      "font_class": "contact",
      "unicode": ""
    },
    {
      "font_class": "contact-filled",
      "unicode": ""
    },
    {
      "font_class": "down",
      "unicode": ""
    },
    {
      "font_class": "bottom",
      "unicode": ""
    },
    {
      "font_class": "download",
      "unicode": ""
    },
    {
      "font_class": "download-filled",
      "unicode": ""
    },
    {
      "font_class": "email",
      "unicode": ""
    },
    {
      "font_class": "email-filled",
      "unicode": ""
    },
    {
      "font_class": "eye",
      "unicode": ""
    },
    {
      "font_class": "eye-filled",
      "unicode": ""
    },
    {
      "font_class": "eye-slash",
      "unicode": ""
    },
    {
      "font_class": "eye-slash-filled",
      "unicode": ""
    },
    {
      "font_class": "fire",
      "unicode": ""
    },
    {
      "font_class": "fire-filled",
      "unicode": ""
    },
    {
      "font_class": "flag",
      "unicode": ""
    },
    {
      "font_class": "flag-filled",
      "unicode": ""
    },
    {
      "font_class": "folder-add",
      "unicode": ""
    },
    {
      "font_class": "folder-add-filled",
      "unicode": ""
    },
    {
      "font_class": "font",
      "unicode": ""
    },
    {
      "font_class": "forward",
      "unicode": ""
    },
    {
      "font_class": "gear",
      "unicode": ""
    },
    {
      "font_class": "gear-filled",
      "unicode": ""
    },
    {
      "font_class": "gift",
      "unicode": ""
    },
    {
      "font_class": "gift-filled",
      "unicode": ""
    },
    {
      "font_class": "hand-down",
      "unicode": ""
    },
    {
      "font_class": "hand-down-filled",
      "unicode": ""
    },
    {
      "font_class": "hand-up",
      "unicode": ""
    },
    {
      "font_class": "hand-up-filled",
      "unicode": ""
    },
    {
      "font_class": "headphones",
      "unicode": ""
    },
    {
      "font_class": "heart",
      "unicode": ""
    },
    {
      "font_class": "heart-filled",
      "unicode": ""
    },
    {
      "font_class": "help",
      "unicode": ""
    },
    {
      "font_class": "help-filled",
      "unicode": ""
    },
    {
      "font_class": "home",
      "unicode": ""
    },
    {
      "font_class": "home-filled",
      "unicode": ""
    },
    {
      "font_class": "image",
      "unicode": ""
    },
    {
      "font_class": "image-filled",
      "unicode": ""
    },
    {
      "font_class": "images",
      "unicode": ""
    },
    {
      "font_class": "images-filled",
      "unicode": ""
    },
    {
      "font_class": "info",
      "unicode": ""
    },
    {
      "font_class": "info-filled",
      "unicode": ""
    },
    {
      "font_class": "left",
      "unicode": ""
    },
    {
      "font_class": "link",
      "unicode": ""
    },
    {
      "font_class": "list",
      "unicode": ""
    },
    {
      "font_class": "location",
      "unicode": ""
    },
    {
      "font_class": "location-filled",
      "unicode": ""
    },
    {
      "font_class": "locked",
      "unicode": ""
    },
    {
      "font_class": "locked-filled",
      "unicode": ""
    },
    {
      "font_class": "loop",
      "unicode": ""
    },
    {
      "font_class": "mail-open",
      "unicode": ""
    },
    {
      "font_class": "mail-open-filled",
      "unicode": ""
    },
    {
      "font_class": "map",
      "unicode": ""
    },
    {
      "font_class": "map-filled",
      "unicode": ""
    },
    {
      "font_class": "map-pin",
      "unicode": ""
    },
    {
      "font_class": "map-pin-ellipse",
      "unicode": ""
    },
    {
      "font_class": "medal",
      "unicode": ""
    },
    {
      "font_class": "medal-filled",
      "unicode": ""
    },
    {
      "font_class": "mic",
      "unicode": ""
    },
    {
      "font_class": "mic-filled",
      "unicode": ""
    },
    {
      "font_class": "micoff",
      "unicode": ""
    },
    {
      "font_class": "micoff-filled",
      "unicode": ""
    },
    {
      "font_class": "minus",
      "unicode": ""
    },
    {
      "font_class": "minus-filled",
      "unicode": ""
    },
    {
      "font_class": "more",
      "unicode": ""
    },
    {
      "font_class": "more-filled",
      "unicode": ""
    },
    {
      "font_class": "navigate",
      "unicode": ""
    },
    {
      "font_class": "navigate-filled",
      "unicode": ""
    },
    {
      "font_class": "notification",
      "unicode": ""
    },
    {
      "font_class": "notification-filled",
      "unicode": ""
    },
    {
      "font_class": "paperclip",
      "unicode": ""
    },
    {
      "font_class": "paperplane",
      "unicode": ""
    },
    {
      "font_class": "paperplane-filled",
      "unicode": ""
    },
    {
      "font_class": "person",
      "unicode": ""
    },
    {
      "font_class": "person-filled",
      "unicode": ""
    },
    {
      "font_class": "personadd",
      "unicode": ""
    },
    {
      "font_class": "personadd-filled",
      "unicode": ""
    },
    {
      "font_class": "personadd-filled-copy",
      "unicode": ""
    },
    {
      "font_class": "phone",
      "unicode": ""
    },
    {
      "font_class": "phone-filled",
      "unicode": ""
    },
    {
      "font_class": "plus",
      "unicode": ""
    },
    {
      "font_class": "plus-filled",
      "unicode": ""
    },
    {
      "font_class": "plusempty",
      "unicode": ""
    },
    {
      "font_class": "pulldown",
      "unicode": ""
    },
    {
      "font_class": "pyq",
      "unicode": ""
    },
    {
      "font_class": "qq",
      "unicode": ""
    },
    {
      "font_class": "redo",
      "unicode": ""
    },
    {
      "font_class": "redo-filled",
      "unicode": ""
    },
    {
      "font_class": "refresh",
      "unicode": ""
    },
    {
      "font_class": "refresh-filled",
      "unicode": ""
    },
    {
      "font_class": "refreshempty",
      "unicode": ""
    },
    {
      "font_class": "reload",
      "unicode": ""
    },
    {
      "font_class": "right",
      "unicode": ""
    },
    {
      "font_class": "scan",
      "unicode": ""
    },
    {
      "font_class": "search",
      "unicode": ""
    },
    {
      "font_class": "settings",
      "unicode": ""
    },
    {
      "font_class": "settings-filled",
      "unicode": ""
    },
    {
      "font_class": "shop",
      "unicode": ""
    },
    {
      "font_class": "shop-filled",
      "unicode": ""
    },
    {
      "font_class": "smallcircle",
      "unicode": ""
    },
    {
      "font_class": "smallcircle-filled",
      "unicode": ""
    },
    {
      "font_class": "sound",
      "unicode": ""
    },
    {
      "font_class": "sound-filled",
      "unicode": ""
    },
    {
      "font_class": "spinner-cycle",
      "unicode": ""
    },
    {
      "font_class": "staff",
      "unicode": ""
    },
    {
      "font_class": "staff-filled",
      "unicode": ""
    },
    {
      "font_class": "star",
      "unicode": ""
    },
    {
      "font_class": "star-filled",
      "unicode": ""
    },
    {
      "font_class": "starhalf",
      "unicode": ""
    },
    {
      "font_class": "trash",
      "unicode": ""
    },
    {
      "font_class": "trash-filled",
      "unicode": ""
    },
    {
      "font_class": "tune",
      "unicode": ""
    },
    {
      "font_class": "tune-filled",
      "unicode": ""
    },
    {
      "font_class": "undo",
      "unicode": ""
    },
    {
      "font_class": "undo-filled",
      "unicode": ""
    },
    {
      "font_class": "up",
      "unicode": ""
    },
    {
      "font_class": "top",
      "unicode": ""
    },
    {
      "font_class": "upload",
      "unicode": ""
    },
    {
      "font_class": "upload-filled",
      "unicode": ""
    },
    {
      "font_class": "videocam",
      "unicode": ""
    },
    {
      "font_class": "videocam-filled",
      "unicode": ""
    },
    {
      "font_class": "vip",
      "unicode": ""
    },
    {
      "font_class": "vip-filled",
      "unicode": ""
    },
    {
      "font_class": "wallet",
      "unicode": ""
    },
    {
      "font_class": "wallet-filled",
      "unicode": ""
    },
    {
      "font_class": "weibo",
      "unicode": ""
    },
    {
      "font_class": "weixin",
      "unicode": ""
    }
  ];
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const getVal = (val) => {
    const reg = /^[0-9]*$/g;
    return typeof val === "number" || reg.test(val) ? val + "px" : val;
  };
  const _sfc_main$l = {
    name: "UniIcons",
    emits: ["click"],
    props: {
      type: {
        type: String,
        default: ""
      },
      color: {
        type: String,
        default: "#333333"
      },
      size: {
        type: [Number, String],
        default: 16
      },
      customPrefix: {
        type: String,
        default: ""
      },
      fontFamily: {
        type: String,
        default: ""
      }
    },
    data() {
      return {
        icons: fontData
      };
    },
    computed: {
      unicode() {
        let code = this.icons.find((v) => v.font_class === this.type);
        if (code) {
          return code.unicode;
        }
        return "";
      },
      iconSize() {
        return getVal(this.size);
      },
      styleObj() {
        if (this.fontFamily !== "") {
          return `color: ${this.color}; font-size: ${this.iconSize}; font-family: ${this.fontFamily};`;
        }
        return `color: ${this.color}; font-size: ${this.iconSize};`;
      }
    },
    methods: {
      _onClick() {
        this.$emit("click");
      }
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock(
      "text",
      {
        style: vue.normalizeStyle($options.styleObj),
        class: vue.normalizeClass(["uni-icons", ["uniui-" + $props.type, $props.customPrefix, $props.customPrefix ? $props.type : ""]]),
        onClick: _cache[0] || (_cache[0] = (...args) => $options._onClick && $options._onClick(...args))
      },
      [
        vue.renderSlot(_ctx.$slots, "default", {}, void 0, true)
      ],
      6
      /* CLASS, STYLE */
    );
  }
  const __easycom_0$3 = /* @__PURE__ */ _export_sfc(_sfc_main$l, [["render", _sfc_render$3], ["__scopeId", "data-v-946bce22"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/node_modules/@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue"]]);
  const _sfc_main$k = /* @__PURE__ */ vue.defineComponent({
    __name: "Navbar",
    props: {
      status: { type: Boolean, required: true },
      shopConfig: { type: null, required: false }
    },
    setup(__props) {
      const props = __props;
      const config = vue.computed(() => {
        return props.shopConfig || {
          id: 1,
          name: "",
          address: "加载中...",
          phone: "",
          deliveryFee: 0,
          deliveryStatus: 1,
          packFee: 0,
          packStatus: 1,
          minOrderAmount: 0,
          openingHours: "",
          notice: "",
          autoAccept: 0
        };
      });
      const { safeAreaInsets } = uni.getSystemInfoSync();
      const phone = () => {
        const phoneNumber = config.value.phone;
        if (phoneNumber)
          uni.makePhoneCall({ phoneNumber });
      };
      return (_ctx, _cache) => {
        var _a;
        const _component_uni_icons = resolveEasycom(vue.resolveDynamicComponent("uni-icons"), __easycom_0$3);
        return vue.openBlock(), vue.createElementBlock("view", { class: "navbar-wrap" }, [
          vue.createCommentVNode(" 蓝色背景 "),
          vue.createElementVNode(
            "view",
            {
              class: "navbar",
              style: vue.normalizeStyle({ paddingTop: ((_a = vue.unref(safeAreaInsets)) == null ? void 0 : _a.top) + "px" })
            },
            [
              vue.createElementVNode("view", { class: "logo" }, [
                vue.createCommentVNode(" 如果没有logo图，可以用文字代替，或者保留你原有的image "),
                vue.createElementVNode("text", { class: "logo-text" }, "寒夜外卖 · 启动")
              ])
            ],
            4
            /* STYLE */
          ),
          vue.createCommentVNode(" 餐厅信息卡片 "),
          vue.createElementVNode("view", { class: "info" }, [
            vue.createCommentVNode(" 1. 状态与费用 "),
            vue.createElementVNode("view", { class: "info-row" }, [
              vue.createElementVNode(
                "view",
                {
                  class: vue.normalizeClass(["status", { closed: !_ctx.status }])
                },
                vue.toDisplayString(_ctx.status ? "营业中" : "打烊中"),
                3
                /* TEXT, CLASS */
              ),
              vue.createElementVNode("view", { class: "delivery" }, [
                vue.createElementVNode(
                  "text",
                  { class: "txt" },
                  "配送费￥" + vue.toDisplayString(config.value.deliveryStatus === 1 ? config.value.deliveryFee : 0),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "split" }, "|"),
                vue.createElementVNode(
                  "text",
                  { class: "txt" },
                  "￥" + vue.toDisplayString(config.value.minOrderAmount) + "起送",
                  1
                  /* TEXT */
                )
              ])
            ]),
            vue.createCommentVNode(" 2. 地址与电话 "),
            vue.createElementVNode("view", { class: "info-row border-bottom" }, [
              vue.createElementVNode("view", { class: "address-box" }, [
                vue.createVNode(_component_uni_icons, {
                  type: "location",
                  size: "14",
                  color: "#666"
                }),
                vue.createElementVNode(
                  "text",
                  { class: "address-text" },
                  vue.toDisplayString(config.value.address),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", {
                class: "phone-btn",
                onClick: phone
              }, [
                vue.createVNode(_component_uni_icons, {
                  type: "phone-filled",
                  size: "18",
                  color: "#00aaff"
                })
              ])
            ]),
            vue.createCommentVNode(" 3. 【新增】营业时间与公告 "),
            vue.createElementVNode("view", { class: "info-row small-text" }, [
              vue.createElementVNode(
                "text",
                null,
                "营业时间：" + vue.toDisplayString(config.value.openingHours || "全天"),
                1
                /* TEXT */
              )
            ]),
            config.value.notice ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "info-row small-text"
            }, [
              vue.createElementVNode("text", { class: "notice-tag" }, "公告"),
              vue.createElementVNode(
                "text",
                { class: "notice-content" },
                vue.toDisplayString(config.value.notice),
                1
                /* TEXT */
              )
            ])) : vue.createCommentVNode("v-if", true)
          ]),
          vue.createElementVNode("view", { class: "blank" })
        ]);
      };
    }
  });
  const Navbar = /* @__PURE__ */ _export_sfc(_sfc_main$k, [["__scopeId", "data-v-e1a17746"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/order/components/Navbar.vue"]]);
  const _sfc_main$j = /* @__PURE__ */ vue.defineComponent({
    __name: "order",
    setup(__props) {
      const status = vue.ref(true);
      const shopConfig = vue.ref({
        id: 1,
        name: "",
        address: "",
        latitude: "",
        longitude: "",
        phone: "",
        deliveryFee: 0,
        deliveryStatus: 1,
        packFee: 0,
        packStatus: 1,
        minOrderAmount: 0,
        openingHours: "",
        notice: "",
        autoAccept: 0
      });
      const categoryList = vue.ref([]);
      const activeIndex = vue.ref(0);
      vue.ref(0);
      const dishList = vue.ref([]);
      vue.ref([]);
      const openCartList = vue.ref(false);
      const cartList = vue.ref([]);
      const CartAllNumber = vue.ref(0);
      const CartAllPrice = vue.ref(0);
      const visible = vue.ref(false);
      const dialogDish = vue.ref();
      const flavors = vue.ref([]);
      const chosedflavors = vue.ref([]);
      const getCategoryData = async () => {
        const res = await getCategoryAPI();
        formatAppLog("log", "at pages/order/order.vue:228", res);
        categoryList.value = res.data;
        formatAppLog("log", "at pages/order/order.vue:230", "categoryList", categoryList.value);
      };
      const getDishOrSetmealList = async (index) => {
        activeIndex.value = index;
        formatAppLog("log", "at pages/order/order.vue:235", "index", index);
        formatAppLog("log", "at pages/order/order.vue:236", "getList by this category", categoryList.value[index]);
        let res;
        if (categoryList.value[index].type === 1) {
          res = await getDishListAPI(categoryList.value[index].id);
        } else {
          res = await getSetmealListAPI(categoryList.value[index].id);
        }
        formatAppLog("log", "at pages/order/order.vue:243", res);
        dishList.value = res.data;
      };
      const getShopData = async () => {
        try {
          const res = await getShopConfigAPI();
          if (res.code === 0 || res.code === 1) {
            shopConfig.value = res.data;
          }
        } catch (e) {
          formatAppLog("error", "at pages/order/order.vue:255", "获取店铺配置失败", e);
        }
      };
      const getCartList = async () => {
        const res = await getCartAPI();
        formatAppLog("log", "at pages/order/order.vue:262", "初始化购物车列表", res);
        cartList.value = res.data;
        CartAllNumber.value = cartList.value.reduce((acc, cur) => acc + cur.number, 0);
        const goodsPrice = cartList.value.reduce((acc, cur) => acc + cur.amount * cur.number, 0);
        let packPrice = 0;
        if (shopConfig.value.packStatus === 1) {
          packPrice = CartAllNumber.value * Number(shopConfig.value.packFee);
        }
        let deliveryPrice = 0;
        if (shopConfig.value.deliveryStatus === 1) {
          deliveryPrice = Number(shopConfig.value.deliveryFee);
        }
        CartAllPrice.value = goodsPrice + packPrice + deliveryPrice;
        formatAppLog("log", "at pages/order/order.vue:284", "CartAllNumber", CartAllNumber.value);
        formatAppLog("log", "at pages/order/order.vue:285", "CartAllPrice", CartAllPrice.value);
        if (cartList.value.length === 0) {
          openCartList.value = false;
        }
      };
      const chooseNorm = async (dish) => {
        formatAppLog("log", "at pages/order/order.vue:294", "点击了选择规格chooseNorm，得到了该菜品的所有口味数据", dish.flavors);
        flavors.value = dish.flavors;
        const tmpdish = Object.assign({}, dish);
        delete tmpdish.flavors;
        dialogDish.value = tmpdish;
        const moreNormdata = dish.flavors.map((obj) => ({ ...obj, list: JSON.parse(obj.list) }));
        moreNormdata.forEach((item) => {
          if (item.list && item.list.length > 0) {
            chosedflavors.value.push(item.list[0]);
          }
        });
        visible.value = true;
      };
      const chooseFlavor = (obj, flavor) => {
        formatAppLog("log", "at pages/order/order.vue:316", "chooseFlavor", flavor);
        let ind = -1;
        let findst = obj.some((n) => {
          ind = chosedflavors.value.findIndex((o) => o == n);
          return ind != -1;
        });
        const indexInChosed = chosedflavors.value.findIndex((it) => it == flavor);
        formatAppLog("log", "at pages/order/order.vue:327", "ind", ind);
        formatAppLog("log", "at pages/order/order.vue:328", "indexInChosed", indexInChosed);
        if (indexInChosed == -1 && !findst) {
          formatAppLog("log", "at pages/order/order.vue:331", "1、当前口味没选过，且当前行没选过口味");
          chosedflavors.value.push(flavor);
        } else if (indexInChosed == -1 && findst && ind >= 0) {
          formatAppLog("log", "at pages/order/order.vue:336", "2、当前口味没选过，但当前行选过口味，替换掉当前行选过的口味");
          chosedflavors.value.splice(ind, 1);
          chosedflavors.value.push(flavor);
        } else {
          formatAppLog("log", "at pages/order/order.vue:342", "3、当前口味选过，进行反选操作，也就是直接删除");
          chosedflavors.value.splice(indexInChosed, 1);
        }
        dialogDish.value.flavors = chosedflavors.value.join(",");
        formatAppLog("log", "at pages/order/order.vue:348", "选好口味后，看看带口味字符串的，dialog中的菜品长什么样？ dialogDish", dialogDish.value);
      };
      const getCopies = (dish) => {
        var _a, _b;
        formatAppLog("log", "at pages/order/order.vue:353", "getCopies", dish);
        if (categoryList.value[activeIndex.value].type === 1) {
          return ((_a = cartList.value.find((item) => item.dishId === dish.id)) == null ? void 0 : _a.number) || 0;
        } else {
          return ((_b = cartList.value.find((item) => item.setmealId === dish.id)) == null ? void 0 : _b.number) || 0;
        }
      };
      const addToCart = async (dish) => {
        formatAppLog("log", "at pages/order/order.vue:364", "addToCart", dish);
        if (!chosedflavors.value || chosedflavors.value.length <= 0) {
          uni.showToast({
            title: "请选择规格",
            icon: "none"
          });
          return false;
        }
        const partialCart = { dishId: dish.id, dishFlavor: chosedflavors.value.join(",") };
        await addToCartAPI(partialCart);
        await getCartList();
        chosedflavors.value = [];
        visible.value = false;
      };
      const addDishAction = async (item, form) => {
        formatAppLog("log", "at pages/order/order.vue:385", "点击了dialog的 “+” 添加菜品数量按钮", item, form);
        formatAppLog("log", "at pages/order/order.vue:386", categoryList.value[activeIndex.value].type === 1);
        if (form == "购物车") {
          formatAppLog("log", "at pages/order/order.vue:389", "addCart", item);
          const partialCart = {
            dishId: item.dishId,
            setmealId: item.setmealId,
            dishFlavor: item.dishFlavor
          };
          await addToCartAPI(partialCart);
        } else {
          formatAppLog("log", "at pages/order/order.vue:398", "普通页面下的dish，点击能直接添加(而不弹出dialog)的菜品说明无口味", item);
          if (categoryList.value[activeIndex.value].type === 1) {
            const partialCart = { dishId: item.id };
            await addToCartAPI(partialCart);
          } else {
            const partialCart = { setmealId: item.id };
            await addToCartAPI(partialCart);
          }
        }
        await getCartList();
      };
      const subDishAction = async (item, form) => {
        formatAppLog("log", "at pages/order/order.vue:413", "点击了减少菜品数量按钮subDishAction--------------------", item, form);
        if (form == "购物车") {
          formatAppLog("log", "at pages/order/order.vue:416", "subCart", item);
          const partialCart = {
            dishId: item.dishId,
            setmealId: item.setmealId,
            dishFlavor: item.dishFlavor
          };
          await subCartAPI(partialCart);
        } else {
          formatAppLog("log", "at pages/order/order.vue:425", "普通页面下的dish，不是dialog中的菜品说明无口味", item);
          if (categoryList.value[activeIndex.value].type === 1) {
            const partialCart = { dishId: item.id };
            await subCartAPI(partialCart);
          } else {
            const partialCart = { setmealId: item.id };
            await subCartAPI(partialCart);
          }
        }
        await getCartList();
      };
      const clearCart = async () => {
        await cleanCartAPI();
        await getCartList();
        openCartList.value = false;
      };
      const submitOrder = () => {
        if (!status.value) {
          uni.showToast({
            title: "店铺已打烊，无法下单",
            icon: "none"
          });
          return;
        }
        if (CartAllPrice.value < shopConfig.value.minOrderAmount) {
          return;
        }
        formatAppLog("log", "at pages/order/order.vue:458", "submitOrder");
        uni.navigateTo({
          url: "/pages/submit/submit"
        });
      };
      onLoad(async () => {
        try {
          const res = await getStatusAPI();
          formatAppLog("log", "at pages/order/order.vue:469", "店铺状态---------", res);
          if (res.data && res.data === 1) {
            status.value = true;
          } else {
            status.value = false;
          }
        } catch (e) {
          formatAppLog("error", "at pages/order/order.vue:477", e);
          status.value = true;
        }
        await getShopData();
        await getCategoryData();
        await getDishOrSetmealList(0);
        await getCartList();
      });
      onShow(async () => {
        await getCategoryData();
        await getCartList();
      });
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("view", { class: "page-container" }, [
          vue.createVNode(Navbar, {
            status: status.value,
            shopConfig: shopConfig.value
          }, null, 8, ["status", "shopConfig"]),
          vue.createElementVNode("view", { class: "viewport" }, [
            vue.createCommentVNode(" 分类 "),
            vue.createElementVNode("view", { class: "categories" }, [
              vue.createCommentVNode(" 左侧：分类列表 "),
              vue.createElementVNode("scroll-view", {
                class: "primary",
                "scroll-y": ""
              }, [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList(categoryList.value, (item, index) => {
                    return vue.openBlock(), vue.createElementBlock("view", {
                      key: item.id,
                      class: vue.normalizeClass(["item", { active: index === activeIndex.value }]),
                      onClick: ($event) => getDishOrSetmealList(index)
                    }, [
                      vue.createElementVNode(
                        "text",
                        { class: "name" },
                        vue.toDisplayString(item.name),
                        1
                        /* TEXT */
                      )
                    ], 10, ["onClick"]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ]),
              vue.createCommentVNode(" 右侧：菜品/套餐列表 "),
              vue.createElementVNode("scroll-view", {
                class: "secondary",
                "scroll-y": ""
              }, [
                vue.createElementVNode("view", { class: "section" }, [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList(dishList.value, (dish) => {
                      return vue.openBlock(), vue.createElementBlock("navigator", {
                        key: dish.id,
                        class: "dish",
                        "hover-class": "none",
                        url: `/pages/detail/detail?${categoryList.value[activeIndex.value].type === 1 ? "dishId" : "setmealId"}=${dish.id}`
                      }, [
                        vue.createElementVNode("image", {
                          class: "image",
                          src: dish.pic
                        }, null, 8, ["src"]),
                        vue.createElementVNode("view", { class: "dishinfo" }, [
                          vue.createElementVNode(
                            "view",
                            { class: "name ellipsis" },
                            vue.toDisplayString(dish.name),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode(
                            "view",
                            { class: "detail ellipsis" },
                            vue.toDisplayString(dish.detail),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode("view", { class: "price" }, [
                            vue.createElementVNode("text", { class: "symbol" }, "¥"),
                            vue.createElementVNode(
                              "text",
                              { class: "number" },
                              vue.toDisplayString(dish.price),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createCommentVNode(" 1、选择规格(口味) "),
                          "flavors" in dish && dish.flavors.length > 0 ? (vue.openBlock(), vue.createElementBlock("image", {
                            key: 0,
                            class: "choosenorm",
                            src: "/static/images/选择规格.png",
                            onClick: vue.withModifiers(($event) => chooseNorm(dish), ["stop"]),
                            mode: "scaleToFill"
                          }, null, 8, ["onClick"])) : (vue.openBlock(), vue.createElementBlock(
                            vue.Fragment,
                            { key: 1 },
                            [
                              vue.createCommentVNode(" 2、加减菜品 "),
                              vue.createElementVNode("view", { class: "sub_add" }, [
                                vue.createCommentVNode(" 减菜按钮 "),
                                getCopies(dish) > 0 ? (vue.openBlock(), vue.createElementBlock("image", {
                                  key: 0,
                                  src: "/static/icon/sub.png",
                                  onClick: vue.withModifiers(($event) => subDishAction(dish, "普通"), ["stop"]),
                                  class: "sub"
                                }, null, 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
                                vue.createCommentVNode(" 菜品份数 "),
                                getCopies(dish) > 0 ? (vue.openBlock(), vue.createElementBlock(
                                  "text",
                                  {
                                    key: 1,
                                    class: "dish_number"
                                  },
                                  vue.toDisplayString(getCopies(dish)),
                                  1
                                  /* TEXT */
                                )) : vue.createCommentVNode("v-if", true),
                                vue.createCommentVNode(" 加菜按钮 "),
                                vue.createElementVNode("image", {
                                  src: "/static/icon/add.png",
                                  onClick: vue.withModifiers(($event) => addDishAction(dish, "普通"), ["stop"]),
                                  class: "add"
                                }, null, 8, ["onClick"])
                              ])
                            ],
                            2112
                            /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
                          ))
                        ])
                      ], 8, ["url"]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ])
            ])
          ]),
          vue.createCommentVNode(" 菜品口味选择dialog弹窗 "),
          vue.withDirectives(vue.createElementVNode(
            "view",
            { class: "dialog" },
            [
              vue.createElementVNode("view", { class: "flavor_pop" }, [
                vue.createElementVNode("view", { class: "title" }, "选择规格"),
                vue.createElementVNode("scroll-view", {
                  class: "scroll",
                  "scroll-y": ""
                }, [
                  vue.createCommentVNode(" 双层口味数组 "),
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList(flavors.value, (flavor) => {
                      return vue.openBlock(), vue.createElementBlock("view", {
                        key: flavor.name,
                        class: "flavor"
                      }, [
                        vue.createElementVNode(
                          "view",
                          null,
                          vue.toDisplayString(flavor.name),
                          1
                          /* TEXT */
                        ),
                        (vue.openBlock(true), vue.createElementBlock(
                          vue.Fragment,
                          null,
                          vue.renderList(JSON.parse(flavor.list), (item, index) => {
                            return vue.openBlock(), vue.createElementBlock("view", {
                              class: vue.normalizeClass({ flavorItem: true, active: chosedflavors.value.findIndex((it) => item === it) !== -1 }),
                              key: index,
                              onClick: ($event) => chooseFlavor(JSON.parse(flavor.list), item)
                            }, vue.toDisplayString(item), 11, ["onClick"]);
                          }),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ]),
                vue.createElementVNode("view", {
                  class: "addToCart",
                  onClick: _cache[0] || (_cache[0] = ($event) => addToCart(dialogDish.value))
                }, "加入购物车")
              ]),
              vue.createElementVNode("view", {
                class: "close_dialog",
                onClick: _cache[1] || (_cache[1] = ($event) => visible.value = false)
              }, "×")
            ],
            512
            /* NEED_PATCH */
          ), [
            [vue.vShow, visible.value]
          ]),
          vue.createCommentVNode(" 灰色空购物车 "),
          cartList.value.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "footer_order_buttom"
          }, [
            vue.createElementVNode("view", { class: "order_number" }, [
              vue.createElementVNode("image", {
                src: "/static/images/cart_empty.png",
                class: "order_number_icon"
              })
            ]),
            vue.createElementVNode("view", { class: "order_price" }, [
              vue.createElementVNode("text", { class: "ico" }, "￥"),
              vue.createTextVNode(" 0 ")
            ]),
            vue.createElementVNode(
              "view",
              { class: "order_btn" },
              " ￥" + vue.toDisplayString(shopConfig.value.minOrderAmount || 0) + "起送 ",
              1
              /* TEXT */
            )
          ])) : (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            { key: 1 },
            [
              vue.createCommentVNode(" 亮起的购物车 "),
              vue.createElementVNode("view", {
                class: "footer_order_buttom",
                onClick: _cache[3] || (_cache[3] = () => openCartList.value = !openCartList.value)
              }, [
                vue.createElementVNode("view", { class: "order_number" }, [
                  vue.createElementVNode("image", {
                    src: "/static/images/cart_active.png",
                    class: "order_number_icon"
                  }),
                  vue.createElementVNode(
                    "view",
                    { class: "order_dish_num" },
                    vue.toDisplayString(CartAllNumber.value),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "order_price" }, [
                  vue.createElementVNode("text", { class: "ico" }, "￥ "),
                  vue.createTextVNode(
                    " " + vue.toDisplayString(parseFloat((Math.round(CartAllPrice.value * 100) / 100).toFixed(2))),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createCommentVNode(" 【核心修改开始】 "),
                vue.createCommentVNode(" 动态判断：如果总价 < 起送价，显示还差多少，且变灰；否则显示去结算 "),
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["order_btn_active", { "disabled-btn": CartAllPrice.value < shopConfig.value.minOrderAmount }]),
                    onClick: _cache[2] || (_cache[2] = vue.withModifiers(($event) => submitOrder(), ["stop"]))
                  },
                  vue.toDisplayString(CartAllPrice.value >= shopConfig.value.minOrderAmount ? "去结算" : `差￥${(shopConfig.value.minOrderAmount - CartAllPrice.value).toFixed(1)}起送`),
                  3
                  /* TEXT, CLASS */
                ),
                vue.createCommentVNode(" 【核心修改结束】 ")
              ])
            ],
            2112
            /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
          )),
          vue.createCommentVNode(" 底部购物车菜品列表 "),
          vue.withDirectives(vue.createElementVNode(
            "view",
            {
              class: "pop_mask",
              onClick: _cache[6] || (_cache[6] = ($event) => openCartList.value = !openCartList.value)
            },
            [
              vue.createElementVNode("view", {
                class: "cart_pop",
                onClick: _cache[5] || (_cache[5] = vue.withModifiers(($event) => openCartList.value = openCartList.value, ["stop"]))
              }, [
                vue.createElementVNode("view", { class: "top_title" }, [
                  vue.createElementVNode("view", { class: "tit" }, " 购物车 "),
                  vue.createElementVNode("view", {
                    class: "clear",
                    onClick: _cache[4] || (_cache[4] = vue.withModifiers(($event) => clearCart(), ["stop"]))
                  }, [
                    vue.createElementVNode("image", {
                      class: "clear_icon",
                      src: "/static/icon/clear.png"
                    }),
                    vue.createElementVNode("text", { class: "clear-des" }, "清空 ")
                  ])
                ]),
                vue.createElementVNode("scroll-view", {
                  class: "card_order_list",
                  "scroll-y": "",
                  "scroll-top": "40rpx"
                }, [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList(cartList.value, (obj, index) => {
                      return vue.openBlock(), vue.createElementBlock("view", {
                        class: "type_item",
                        key: index
                      }, [
                        vue.createElementVNode("view", { class: "dish_img" }, [
                          vue.createElementVNode("image", {
                            mode: "aspectFill",
                            src: obj.pic,
                            class: "dish_img_url"
                          }, null, 8, ["src"])
                        ]),
                        vue.createElementVNode("view", { class: "dish_info" }, [
                          vue.createElementVNode(
                            "view",
                            { class: "dish_name" },
                            vue.toDisplayString(obj.name),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode("view", { class: "dish_price" }, [
                            vue.createElementVNode("text", { class: "ico" }, "￥"),
                            vue.createTextVNode(
                              " " + vue.toDisplayString(obj.amount),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode(
                            "view",
                            { class: "dish_flavor" },
                            vue.toDisplayString(obj.dishFlavor),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode("view", { class: "dish_active" }, [
                            obj.number && obj.number > 0 ? (vue.openBlock(), vue.createElementBlock("image", {
                              key: 0,
                              src: "/static/icon/sub.png",
                              onClick: vue.withModifiers(($event) => subDishAction(obj, "购物车"), ["stop"]),
                              class: "dish_sub"
                            }, null, 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
                            obj.number && obj.number > 0 ? (vue.openBlock(), vue.createElementBlock(
                              "text",
                              {
                                key: 1,
                                class: "dish_number"
                              },
                              vue.toDisplayString(obj.number),
                              1
                              /* TEXT */
                            )) : vue.createCommentVNode("v-if", true),
                            vue.createElementVNode("image", {
                              src: "/static/icon/add.png",
                              class: "dish_add",
                              onClick: vue.withModifiers(($event) => addDishAction(obj, "购物车"), ["stop"])
                            }, null, 8, ["onClick"])
                          ])
                        ])
                      ]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  )),
                  vue.createElementVNode("view", { class: "seize_seat" })
                ])
              ])
            ],
            512
            /* NEED_PATCH */
          ), [
            [vue.vShow, openCartList.value]
          ]),
          vue.createCommentVNode(' <view v-show="!status" class="closed-mask">\r\n  <view class="tips">本店已打烊</view>\r\n</view> ')
        ]);
      };
    }
  });
  const PagesOrderOrder = /* @__PURE__ */ _export_sfc(_sfc_main$j, [["__scopeId", "data-v-88bf5328"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/order/order.vue"]]);
  class MPAnimation {
    constructor(options, _this) {
      this.options = options;
      this.animation = uni.createAnimation({
        ...options
      });
      this.currentStepAnimates = {};
      this.next = 0;
      this.$ = _this;
    }
    _nvuePushAnimates(type, args) {
      let aniObj = this.currentStepAnimates[this.next];
      let styles = {};
      if (!aniObj) {
        styles = {
          styles: {},
          config: {}
        };
      } else {
        styles = aniObj;
      }
      if (animateTypes1.includes(type)) {
        if (!styles.styles.transform) {
          styles.styles.transform = "";
        }
        let unit = "";
        if (type === "rotate") {
          unit = "deg";
        }
        styles.styles.transform += `${type}(${args + unit}) `;
      } else {
        styles.styles[type] = `${args}`;
      }
      this.currentStepAnimates[this.next] = styles;
    }
    _animateRun(styles = {}, config = {}) {
      let ref = this.$.$refs["ani"].ref;
      if (!ref)
        return;
      return new Promise((resolve, reject) => {
        nvueAnimation.transition(ref, {
          styles,
          ...config
        }, (res) => {
          resolve();
        });
      });
    }
    _nvueNextAnimate(animates, step = 0, fn) {
      let obj = animates[step];
      if (obj) {
        let {
          styles,
          config
        } = obj;
        this._animateRun(styles, config).then(() => {
          step += 1;
          this._nvueNextAnimate(animates, step, fn);
        });
      } else {
        this.currentStepAnimates = {};
        typeof fn === "function" && fn();
        this.isEnd = true;
      }
    }
    step(config = {}) {
      this.animation.step(config);
      return this;
    }
    run(fn) {
      this.$.animationData = this.animation.export();
      this.$.timer = setTimeout(() => {
        typeof fn === "function" && fn();
      }, this.$.durationTime);
    }
  }
  const animateTypes1 = [
    "matrix",
    "matrix3d",
    "rotate",
    "rotate3d",
    "rotateX",
    "rotateY",
    "rotateZ",
    "scale",
    "scale3d",
    "scaleX",
    "scaleY",
    "scaleZ",
    "skew",
    "skewX",
    "skewY",
    "translate",
    "translate3d",
    "translateX",
    "translateY",
    "translateZ"
  ];
  const animateTypes2 = ["opacity", "backgroundColor"];
  const animateTypes3 = ["width", "height", "left", "right", "top", "bottom"];
  animateTypes1.concat(animateTypes2, animateTypes3).forEach((type) => {
    MPAnimation.prototype[type] = function(...args) {
      this.animation[type](...args);
      return this;
    };
  });
  function createAnimation(option, _this) {
    if (!_this)
      return;
    clearTimeout(_this.timer);
    return new MPAnimation(option, _this);
  }
  const _sfc_main$i = {
    name: "uniTransition",
    emits: ["click", "change"],
    props: {
      show: {
        type: Boolean,
        default: false
      },
      modeClass: {
        type: [Array, String],
        default() {
          return "fade";
        }
      },
      duration: {
        type: Number,
        default: 300
      },
      styles: {
        type: Object,
        default() {
          return {};
        }
      },
      customClass: {
        type: String,
        default: ""
      },
      onceRender: {
        type: Boolean,
        default: false
      }
    },
    data() {
      return {
        isShow: false,
        transform: "",
        opacity: 1,
        animationData: {},
        durationTime: 300,
        config: {}
      };
    },
    watch: {
      show: {
        handler(newVal) {
          if (newVal) {
            this.open();
          } else {
            if (this.isShow) {
              this.close();
            }
          }
        },
        immediate: true
      }
    },
    computed: {
      // 生成样式数据
      stylesObject() {
        let styles = {
          ...this.styles,
          "transition-duration": this.duration / 1e3 + "s"
        };
        let transform = "";
        for (let i in styles) {
          let line = this.toLine(i);
          transform += line + ":" + styles[i] + ";";
        }
        return transform;
      },
      // 初始化动画条件
      transformStyles() {
        return "transform:" + this.transform + ";opacity:" + this.opacity + ";" + this.stylesObject;
      }
    },
    created() {
      this.config = {
        duration: this.duration,
        timingFunction: "ease",
        transformOrigin: "50% 50%",
        delay: 0
      };
      this.durationTime = this.duration;
    },
    methods: {
      /**
       *  ref 触发 初始化动画
       */
      init(obj = {}) {
        if (obj.duration) {
          this.durationTime = obj.duration;
        }
        this.animation = createAnimation(Object.assign(this.config, obj), this);
      },
      /**
       * 点击组件触发回调
       */
      onClick() {
        this.$emit("click", {
          detail: this.isShow
        });
      },
      /**
       * ref 触发 动画分组
       * @param {Object} obj
       */
      step(obj, config = {}) {
        if (!this.animation)
          return;
        for (let i in obj) {
          try {
            if (typeof obj[i] === "object") {
              this.animation[i](...obj[i]);
            } else {
              this.animation[i](obj[i]);
            }
          } catch (e) {
            console.error(`方法 ${i} 不存在`);
          }
        }
        this.animation.step(config);
        return this;
      },
      /**
       *  ref 触发 执行动画
       */
      run(fn) {
        if (!this.animation)
          return;
        this.animation.run(fn);
      },
      // 开始过度动画
      open() {
        clearTimeout(this.timer);
        this.transform = "";
        this.isShow = true;
        let { opacity, transform } = this.styleInit(false);
        if (typeof opacity !== "undefined") {
          this.opacity = opacity;
        }
        this.transform = transform;
        this.$nextTick(() => {
          this.timer = setTimeout(() => {
            this.animation = createAnimation(this.config, this);
            this.tranfromInit(false).step();
            this.animation.run();
            this.$emit("change", {
              detail: this.isShow
            });
          }, 20);
        });
      },
      // 关闭过度动画
      close(type) {
        if (!this.animation)
          return;
        this.tranfromInit(true).step().run(() => {
          this.isShow = false;
          this.animationData = null;
          this.animation = null;
          let { opacity, transform } = this.styleInit(false);
          this.opacity = opacity || 1;
          this.transform = transform;
          this.$emit("change", {
            detail: this.isShow
          });
        });
      },
      // 处理动画开始前的默认样式
      styleInit(type) {
        let styles = {
          transform: ""
        };
        let buildStyle = (type2, mode) => {
          if (mode === "fade") {
            styles.opacity = this.animationType(type2)[mode];
          } else {
            styles.transform += this.animationType(type2)[mode] + " ";
          }
        };
        if (typeof this.modeClass === "string") {
          buildStyle(type, this.modeClass);
        } else {
          this.modeClass.forEach((mode) => {
            buildStyle(type, mode);
          });
        }
        return styles;
      },
      // 处理内置组合动画
      tranfromInit(type) {
        let buildTranfrom = (type2, mode) => {
          let aniNum = null;
          if (mode === "fade") {
            aniNum = type2 ? 0 : 1;
          } else {
            aniNum = type2 ? "-100%" : "0";
            if (mode === "zoom-in") {
              aniNum = type2 ? 0.8 : 1;
            }
            if (mode === "zoom-out") {
              aniNum = type2 ? 1.2 : 1;
            }
            if (mode === "slide-right") {
              aniNum = type2 ? "100%" : "0";
            }
            if (mode === "slide-bottom") {
              aniNum = type2 ? "100%" : "0";
            }
          }
          this.animation[this.animationMode()[mode]](aniNum);
        };
        if (typeof this.modeClass === "string") {
          buildTranfrom(type, this.modeClass);
        } else {
          this.modeClass.forEach((mode) => {
            buildTranfrom(type, mode);
          });
        }
        return this.animation;
      },
      animationType(type) {
        return {
          fade: type ? 1 : 0,
          "slide-top": `translateY(${type ? "0" : "-100%"})`,
          "slide-right": `translateX(${type ? "0" : "100%"})`,
          "slide-bottom": `translateY(${type ? "0" : "100%"})`,
          "slide-left": `translateX(${type ? "0" : "-100%"})`,
          "zoom-in": `scaleX(${type ? 1 : 0.8}) scaleY(${type ? 1 : 0.8})`,
          "zoom-out": `scaleX(${type ? 1 : 1.2}) scaleY(${type ? 1 : 1.2})`
        };
      },
      // 内置动画类型与实际动画对应字典
      animationMode() {
        return {
          fade: "opacity",
          "slide-top": "translateY",
          "slide-right": "translateX",
          "slide-bottom": "translateY",
          "slide-left": "translateX",
          "zoom-in": "scale",
          "zoom-out": "scale"
        };
      },
      // 驼峰转中横线
      toLine(name) {
        return name.replace(/([A-Z])/g, "-$1").toLowerCase();
      }
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.withDirectives((vue.openBlock(), vue.createElementBlock("view", {
      ref: "ani",
      animation: $data.animationData,
      class: vue.normalizeClass($props.customClass),
      style: vue.normalizeStyle($options.transformStyles),
      onClick: _cache[0] || (_cache[0] = (...args) => $options.onClick && $options.onClick(...args))
    }, [
      vue.renderSlot(_ctx.$slots, "default")
    ], 14, ["animation"])), [
      [vue.vShow, $data.isShow]
    ]);
  }
  const __easycom_0$2 = /* @__PURE__ */ _export_sfc(_sfc_main$i, [["render", _sfc_render$2], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/node_modules/@dcloudio/uni-ui/lib/uni-transition/uni-transition.vue"]]);
  const _sfc_main$h = {
    name: "uniPopup",
    components: {},
    emits: ["change", "maskClick"],
    props: {
      // 开启动画
      animation: {
        type: Boolean,
        default: true
      },
      // 弹出层类型，可选值，top: 顶部弹出层；bottom：底部弹出层；center：全屏弹出层
      // message: 消息提示 ; dialog : 对话框
      type: {
        type: String,
        default: "center"
      },
      // maskClick
      isMaskClick: {
        type: Boolean,
        default: null
      },
      // TODO 2 个版本后废弃属性 ，使用 isMaskClick
      maskClick: {
        type: Boolean,
        default: null
      },
      backgroundColor: {
        type: String,
        default: "none"
      },
      safeArea: {
        type: Boolean,
        default: true
      },
      maskBackgroundColor: {
        type: String,
        default: "rgba(0, 0, 0, 0.4)"
      },
      borderRadius: {
        type: String
      }
    },
    watch: {
      /**
       * 监听type类型
       */
      type: {
        handler: function(type) {
          if (!this.config[type])
            return;
          this[this.config[type]](true);
        },
        immediate: true
      },
      isDesktop: {
        handler: function(newVal) {
          if (!this.config[newVal])
            return;
          this[this.config[this.type]](true);
        },
        immediate: true
      },
      /**
       * 监听遮罩是否可点击
       * @param {Object} val
       */
      maskClick: {
        handler: function(val) {
          this.mkclick = val;
        },
        immediate: true
      },
      isMaskClick: {
        handler: function(val) {
          this.mkclick = val;
        },
        immediate: true
      },
      // H5 下禁止底部滚动
      showPopup(show) {
      }
    },
    data() {
      return {
        duration: 300,
        ani: [],
        showPopup: false,
        showTrans: false,
        popupWidth: 0,
        popupHeight: 0,
        config: {
          top: "top",
          bottom: "bottom",
          center: "center",
          left: "left",
          right: "right",
          message: "top",
          dialog: "center",
          share: "bottom"
        },
        maskClass: {
          position: "fixed",
          bottom: 0,
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(0, 0, 0, 0.4)"
        },
        transClass: {
          backgroundColor: "transparent",
          borderRadius: this.borderRadius || "0",
          position: "fixed",
          left: 0,
          right: 0
        },
        maskShow: true,
        mkclick: true,
        popupstyle: "top"
      };
    },
    computed: {
      getStyles() {
        let res = { backgroundColor: this.bg };
        if (this.borderRadius || "0") {
          res = Object.assign(res, { borderRadius: this.borderRadius });
        }
        return res;
      },
      isDesktop() {
        return this.popupWidth >= 500 && this.popupHeight >= 500;
      },
      bg() {
        if (this.backgroundColor === "" || this.backgroundColor === "none") {
          return "transparent";
        }
        return this.backgroundColor;
      }
    },
    mounted() {
      const fixSize = () => {
        const {
          windowWidth,
          windowHeight,
          windowTop,
          safeArea,
          screenHeight,
          safeAreaInsets
        } = uni.getSystemInfoSync();
        this.popupWidth = windowWidth;
        this.popupHeight = windowHeight + (windowTop || 0);
        if (safeArea && this.safeArea) {
          this.safeAreaInsets = safeAreaInsets.bottom;
        } else {
          this.safeAreaInsets = 0;
        }
      };
      fixSize();
    },
    // TODO vue3
    unmounted() {
      this.setH5Visible();
    },
    activated() {
      this.setH5Visible(!this.showPopup);
    },
    deactivated() {
      this.setH5Visible(true);
    },
    created() {
      if (this.isMaskClick === null && this.maskClick === null) {
        this.mkclick = true;
      } else {
        this.mkclick = this.isMaskClick !== null ? this.isMaskClick : this.maskClick;
      }
      if (this.animation) {
        this.duration = 300;
      } else {
        this.duration = 0;
      }
      this.messageChild = null;
      this.clearPropagation = false;
      this.maskClass.backgroundColor = this.maskBackgroundColor;
    },
    methods: {
      setH5Visible(visible = true) {
      },
      /**
       * 公用方法，不显示遮罩层
       */
      closeMask() {
        this.maskShow = false;
      },
      /**
       * 公用方法，遮罩层禁止点击
       */
      disableMask() {
        this.mkclick = false;
      },
      // TODO nvue 取消冒泡
      clear(e) {
        e.stopPropagation();
        this.clearPropagation = true;
      },
      open(direction) {
        if (this.showPopup) {
          return;
        }
        let innerType = ["top", "center", "bottom", "left", "right", "message", "dialog", "share"];
        if (!(direction && innerType.indexOf(direction) !== -1)) {
          direction = this.type;
        }
        if (!this.config[direction]) {
          console.error("缺少类型：", direction);
          return;
        }
        this[this.config[direction]]();
        this.$emit("change", {
          show: true,
          type: direction
        });
      },
      close(type) {
        this.showTrans = false;
        this.$emit("change", {
          show: false,
          type: this.type
        });
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.showPopup = false;
        }, 300);
      },
      // TODO 处理冒泡事件，头条的冒泡事件有问题 ，先这样兼容
      touchstart() {
        this.clearPropagation = false;
      },
      onTap() {
        if (this.clearPropagation) {
          this.clearPropagation = false;
          return;
        }
        this.$emit("maskClick");
        if (!this.mkclick)
          return;
        this.close();
      },
      /**
       * 顶部弹出样式处理
       */
      top(type) {
        this.popupstyle = this.isDesktop ? "fixforpc-top" : "top";
        this.ani = ["slide-top"];
        this.transClass = {
          position: "fixed",
          left: 0,
          right: 0,
          backgroundColor: this.bg,
          borderRadius: this.borderRadius || "0"
        };
        if (type)
          return;
        this.showPopup = true;
        this.showTrans = true;
        this.$nextTick(() => {
          if (this.messageChild && this.type === "message") {
            this.messageChild.timerClose();
          }
        });
      },
      /**
       * 底部弹出样式处理
       */
      bottom(type) {
        this.popupstyle = "bottom";
        this.ani = ["slide-bottom"];
        this.transClass = {
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: this.safeAreaInsets + "px",
          backgroundColor: this.bg,
          borderRadius: this.borderRadius || "0"
        };
        if (type)
          return;
        this.showPopup = true;
        this.showTrans = true;
      },
      /**
       * 中间弹出样式处理
       */
      center(type) {
        this.popupstyle = "center";
        this.ani = ["zoom-out", "fade"];
        this.transClass = {
          position: "fixed",
          display: "flex",
          flexDirection: "column",
          bottom: 0,
          left: 0,
          right: 0,
          top: 0,
          justifyContent: "center",
          alignItems: "center",
          borderRadius: this.borderRadius || "0"
        };
        if (type)
          return;
        this.showPopup = true;
        this.showTrans = true;
      },
      left(type) {
        this.popupstyle = "left";
        this.ani = ["slide-left"];
        this.transClass = {
          position: "fixed",
          left: 0,
          bottom: 0,
          top: 0,
          backgroundColor: this.bg,
          borderRadius: this.borderRadius || "0",
          display: "flex",
          flexDirection: "column"
        };
        if (type)
          return;
        this.showPopup = true;
        this.showTrans = true;
      },
      right(type) {
        this.popupstyle = "right";
        this.ani = ["slide-right"];
        this.transClass = {
          position: "fixed",
          bottom: 0,
          right: 0,
          top: 0,
          backgroundColor: this.bg,
          borderRadius: this.borderRadius || "0",
          display: "flex",
          flexDirection: "column"
        };
        if (type)
          return;
        this.showPopup = true;
        this.showTrans = true;
      }
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_uni_transition = resolveEasycom(vue.resolveDynamicComponent("uni-transition"), __easycom_0$2);
    return $data.showPopup ? (vue.openBlock(), vue.createElementBlock(
      "view",
      {
        key: 0,
        class: vue.normalizeClass(["uni-popup", [$data.popupstyle, $options.isDesktop ? "fixforpc-z-index" : ""]])
      },
      [
        vue.createElementVNode(
          "view",
          {
            onTouchstart: _cache[1] || (_cache[1] = (...args) => $options.touchstart && $options.touchstart(...args))
          },
          [
            $data.maskShow ? (vue.openBlock(), vue.createBlock(_component_uni_transition, {
              key: "1",
              name: "mask",
              "mode-class": "fade",
              styles: $data.maskClass,
              duration: $data.duration,
              show: $data.showTrans,
              onClick: $options.onTap
            }, null, 8, ["styles", "duration", "show", "onClick"])) : vue.createCommentVNode("v-if", true),
            vue.createVNode(_component_uni_transition, {
              key: "2",
              "mode-class": $data.ani,
              name: "content",
              styles: $data.transClass,
              duration: $data.duration,
              show: $data.showTrans,
              onClick: $options.onTap
            }, {
              default: vue.withCtx(() => [
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["uni-popup__wrapper", [$data.popupstyle]]),
                    style: vue.normalizeStyle($options.getStyles),
                    onClick: _cache[0] || (_cache[0] = (...args) => $options.clear && $options.clear(...args))
                  },
                  [
                    vue.renderSlot(_ctx.$slots, "default", {}, void 0, true)
                  ],
                  6
                  /* CLASS, STYLE */
                )
              ]),
              _: 3
              /* FORWARDED */
            }, 8, ["mode-class", "styles", "duration", "show", "onClick"])
          ],
          32
          /* NEED_HYDRATION */
        )
      ],
      2
      /* CLASS */
    )) : vue.createCommentVNode("v-if", true);
  }
  const __easycom_0$1 = /* @__PURE__ */ _export_sfc(_sfc_main$h, [["render", _sfc_render$1], ["__scopeId", "data-v-7db519c7"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/node_modules/@dcloudio/uni-ui/lib/uni-popup/uni-popup.vue"]]);
  const _sfc_main$g = /* @__PURE__ */ vue.defineComponent({
    __name: "pushMsg",
    setup(__props, { expose: __expose }) {
      const popup = vue.ref();
      const openPopup = () => {
        if (popup.value) {
          popup.value.open();
        }
      };
      const closePopup = () => {
        if (popup.value) {
          popup.value.close();
        }
      };
      const confirm = () => {
        closePopup();
      };
      __expose({
        openPopup,
        closePopup
      });
      return (_ctx, _cache) => {
        const _component_uni_popup = resolveEasycom(vue.resolveDynamicComponent("uni-popup"), __easycom_0$1);
        return vue.openBlock(), vue.createElementBlock(
          vue.Fragment,
          null,
          [
            vue.createCommentVNode(" 催单massageBox "),
            vue.createVNode(
              _component_uni_popup,
              {
                ref_key: "popup",
                ref: popup,
                type: "center",
                "is-mask-click": true
              },
              {
                default: vue.withCtx(() => [
                  vue.createElementVNode("view", { class: "pop" }, [
                    vue.createElementVNode("view", { class: "title" }, " 温馨提示 "),
                    vue.createElementVNode("view", { class: "tip-img" }, [
                      vue.createElementVNode("image", { src: "/static/images/success.png" })
                    ]),
                    vue.createElementVNode("view", { class: "tip-info" }, " 37已成功帮你催单~ "),
                    vue.createElementVNode("view", {
                      class: "sure",
                      onClick: confirm
                    }, " 确定 ")
                  ])
                ]),
                _: 1
                /* STABLE */
              },
              512
              /* NEED_PATCH */
            )
          ],
          2112
          /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
        );
      };
    }
  });
  const pushMsg = /* @__PURE__ */ _export_sfc(_sfc_main$g, [["__scopeId", "data-v-c5285223"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/components/message/pushMsg.vue"]]);
  const getUserInfoAPI = (id) => {
    return http({
      url: `/user/user/${id}`,
      method: "GET"
    });
  };
  const updateUserAPI = (params) => {
    return http({
      url: "/user/user",
      method: "PUT",
      data: params
    });
  };
  const submitOrderAPI = (params) => {
    return http({
      url: "/user/order/submit",
      method: "POST",
      data: params
    });
  };
  const payOrderAPI = (params) => {
    return http({
      url: "/user/order/payment",
      method: "PUT",
      data: params
    });
  };
  const getUnPayOrderAPI = () => {
    return http({
      url: "/user/order/unPayOrderCount",
      method: "GET"
    });
  };
  const getOrderAPI = (id) => {
    formatAppLog("log", "at api/order.ts:32", "byd !!! id", id);
    return http({
      url: `/user/order/orderDetail/${id}`,
      method: "GET"
    });
  };
  const getOrderPageAPI = (params) => {
    formatAppLog("log", "at api/order.ts:41", "params", params);
    return http({
      url: "/user/order/historyOrders",
      method: "GET",
      data: params
    });
  };
  const cancelOrderAPI = (id) => {
    return http({
      url: `/user/order/cancel/${id}`,
      method: "PUT"
    });
  };
  const reOrderAPI = (id) => {
    return http({
      url: `/user/order/reOrder/${id}`,
      method: "POST"
    });
  };
  const urgeOrderAPI = (id) => {
    return http({
      url: `/user/order/reminder/${id}`,
      method: "GET"
    });
  };
  const _sfc_main$f = /* @__PURE__ */ vue.defineComponent({
    __name: "my",
    setup(__props) {
      const userStore = useUserStore();
      const childComp = vue.ref(null);
      const getTotalCopies = (order) => {
        return (order.orderDetailList || []).reduce((sum, it) => sum + (it.number || 0), 0);
      };
      const statusList = [
        {
          status: 0,
          name: "全部订单"
        },
        {
          status: 1,
          name: "待付款"
        },
        {
          status: 2,
          name: "待接单"
        },
        {
          status: 3,
          name: "已接单"
        },
        {
          status: 4,
          name: "派送中"
        },
        {
          status: 5,
          name: "已完成"
        },
        {
          status: 6,
          name: "已取消"
        }
      ];
      const user = vue.reactive({
        id: userStore.profile.id,
        name: "",
        gender: 1,
        phone: "未设置",
        pic: ""
      });
      const historyOrders = vue.ref([]);
      const orderDTO = vue.ref({
        page: 1,
        pageSize: 6
      });
      const total = vue.ref(0);
      onLoad(async (options) => {
        formatAppLog("log", "at pages/my/my.vue:147", "options", options);
        formatAppLog("log", "at pages/my/my.vue:148", "userStore", userStore.profile);
        await getUserInfo(user.id);
        await getOrderPage();
      });
      const getUserInfo = async (id) => {
        const res = await getUserInfoAPI(id);
        formatAppLog("log", "at pages/my/my.vue:156", "用户信息", res);
        user.name = res.data.name;
        user.gender = res.data.gender ?? 1;
        user.phone = res.data.phone;
        user.pic = res.data.pic;
      };
      const getOrderPage = async () => {
        formatAppLog("log", "at pages/my/my.vue:164", "orderDTO", orderDTO.value);
        const res = await getOrderPageAPI(orderDTO.value);
        historyOrders.value = historyOrders.value.concat(res.data.records);
        total.value = res.data.total;
      };
      const reOrder = async (id) => {
        formatAppLog("log", "at pages/my/my.vue:172", "再来一单", id);
        await cleanCartAPI();
        await reOrderAPI(id);
        uni.switchTab({
          url: "/pages/order/order"
        });
      };
      const pushOrder = async (id) => {
        formatAppLog("log", "at pages/my/my.vue:185", "催单", id);
        await urgeOrderAPI(id);
        childComp.value.openPopup();
      };
      onReachBottom(() => {
        formatAppLog("log", "at pages/my/my.vue:196", "Page:", orderDTO.value.page);
        formatAppLog("log", "at pages/my/my.vue:197", "Page Size:", orderDTO.value.pageSize);
        if (orderDTO.value.page * orderDTO.value.pageSize >= Math.min(total.value, 12)) {
          formatAppLog("log", "at pages/my/my.vue:199", "end!");
          uni.showToast({
            title: "更多订单信息请到历史订单查看！",
            icon: "none"
          });
          return;
        }
        orderDTO.value.page += 1;
        getOrderPage();
      });
      const toOrderDetail = (id) => {
        uni.navigateTo({
          url: "/pages/orderDetail/orderDetail?orderId=" + id
        });
      };
      const goAddress = () => {
        uni.navigateTo({
          url: "/pages/address/address"
        });
      };
      const goHistory = () => {
        uni.navigateTo({
          url: "/pages/history/history"
        });
      };
      const goMyself = () => {
        uni.navigateTo({
          url: "/pages/updateMy/updateMy"
        });
      };
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock(
          vue.Fragment,
          null,
          [
            vue.createElementVNode("view", { class: "page" }, [
              vue.createCommentVNode(" 1、个人信息 "),
              vue.createElementVNode("view", { class: "my_info" }, [
                vue.createCommentVNode(" 头像部分 "),
                vue.createElementVNode("view", { class: "head" }, [
                  vue.createElementVNode("image", {
                    class: "head_image",
                    src: user.pic
                  }, null, 8, ["src"])
                ]),
                vue.createCommentVNode(" 姓名、性别及手机号 "),
                vue.createElementVNode("view", { class: "phone_name" }, [
                  vue.createCommentVNode(" 姓名 "),
                  vue.createElementVNode("view", { class: "name" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "name_text" },
                      vue.toDisplayString(user.name),
                      1
                      /* TEXT */
                    ),
                    user.gender === 0 ? (vue.openBlock(), vue.createElementBlock("image", {
                      key: 0,
                      class: "name_type",
                      src: "/static/icon/girl.png"
                    })) : (vue.openBlock(), vue.createElementBlock("image", {
                      key: 1,
                      class: "name_type",
                      src: "/static/icon/boy.png"
                    }))
                  ]),
                  vue.createCommentVNode(" 电话号 "),
                  vue.createElementVNode("view", { class: "phone" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "phone_text" },
                      vue.toDisplayString(user.phone),
                      1
                      /* TEXT */
                    )
                  ])
                ])
              ]),
              vue.createCommentVNode(" 2、地址管理 + 历史订单 "),
              vue.createElementVNode("view", { class: "white_box" }, [
                vue.createElementVNode("view", {
                  class: "bottom_text",
                  onClick: goAddress
                }, [
                  vue.createElementVNode("image", {
                    class: "icon",
                    src: "/static/icon/address.png"
                  }),
                  vue.createElementVNode("view", { class: "text_left" }, "地址管理"),
                  vue.createElementVNode("view", { class: "right_image" }, [
                    vue.createElementVNode("image", {
                      class: "to_right",
                      src: "/static/icon/toRight.png"
                    })
                  ])
                ]),
                vue.createElementVNode("view", {
                  class: "bottom_text",
                  onClick: goHistory
                }, [
                  vue.createElementVNode("image", {
                    class: "icon",
                    src: "/static/icon/history.png"
                  }),
                  vue.createElementVNode("view", { class: "text_left" }, "历史订单"),
                  vue.createElementVNode("view", { class: "right_image" }, [
                    vue.createElementVNode("image", {
                      class: "to_right",
                      src: "/static/icon/toRight.png"
                    })
                  ])
                ]),
                vue.createElementVNode("view", {
                  class: "bottom_text",
                  onClick: goMyself
                }, [
                  vue.createElementVNode("image", {
                    class: "icon",
                    src: "/static/icon/my.png"
                  }),
                  vue.createElementVNode("view", { class: "text_left" }, "信息设置"),
                  vue.createElementVNode("view", { class: "right_image" }, [
                    vue.createElementVNode("image", {
                      class: "to_right",
                      src: "/static/icon/toRight.png"
                    })
                  ])
                ])
              ]),
              vue.createElementVNode("view", { class: "history_content" }, [
                vue.createElementVNode("view", { class: "title" }, "最近订单"),
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList(historyOrders.value, (item, index) => {
                    return vue.openBlock(), vue.createElementBlock("view", {
                      class: "history_item",
                      key: index,
                      onClick: ($event) => toOrderDetail(item.id)
                    }, [
                      vue.createElementVNode("view", { class: "item_info_box" }, [
                        vue.createElementVNode("view", { class: "history_item_left" }, [
                          vue.createElementVNode(
                            "view",
                            { class: "history_item_order_id" },
                            "订单号：" + vue.toDisplayString(item.number),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode("scroll-view", {
                            class: "scroll_container",
                            "scroll-x": ""
                          }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList(item.orderDetailList, (dish, index2) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: index2,
                                  class: "image_box"
                                }, [
                                  vue.createElementVNode("image", {
                                    src: dish.pic
                                  }, null, 8, ["src"])
                                ]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ]),
                          vue.createElementVNode(
                            "view",
                            { class: "history_item_order_time" },
                            vue.toDisplayString(item.orderTime),
                            1
                            /* TEXT */
                          )
                        ]),
                        vue.createElementVNode("view", { class: "history_item_right" }, [
                          vue.createElementVNode(
                            "view",
                            { class: "history_item_status" },
                            vue.toDisplayString(statusList[item.status].name),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode(
                            "view",
                            { class: "history_item_price" },
                            "￥" + vue.toDisplayString(item.amount),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode(
                            "view",
                            { class: "history_item_dish_amount" },
                            "共" + vue.toDisplayString(getTotalCopies(item)) + "份",
                            1
                            /* TEXT */
                          )
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "btn_box" }, [
                        vue.createElementVNode("view", {
                          class: "history_item_reOrder",
                          onClick: vue.withModifiers(($event) => reOrder(item.id), ["stop"])
                        }, "再来一单", 8, ["onClick"]),
                        item.status === 2 ? (vue.openBlock(), vue.createElementBlock("view", {
                          key: 0,
                          class: "history_item_push_order",
                          onClick: vue.withModifiers(($event) => pushOrder(item.id), ["stop"])
                        }, " 催单 ", 8, ["onClick"])) : vue.createCommentVNode("v-if", true)
                      ])
                    ], 8, ["onClick"]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ])
            ]),
            vue.createCommentVNode(" 催单massageBox "),
            vue.createVNode(
              pushMsg,
              {
                ref_key: "childComp",
                ref: childComp
              },
              null,
              512
              /* NEED_PATCH */
            )
          ],
          64
          /* STABLE_FRAGMENT */
        );
      };
    }
  });
  const PagesMyMy = /* @__PURE__ */ _export_sfc(_sfc_main$f, [["__scopeId", "data-v-d3687551"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/my/my.vue"]]);
  const _sfc_main$e = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props) {
      const toOrderPage = () => {
        uni.switchTab({
          url: "/pages/order/order"
        });
      };
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
          vue.createElementVNode("swiper", {
            autoplay: true,
            circular: true,
            "indicator-dots": true,
            "indicator-color": "#ffffff",
            "indicator-active-color": "#22ccff",
            interval: 2e3
          }, [
            vue.createElementVNode("swiper-item", null, [
              vue.createElementVNode("image", {
                mode: "widthFix",
                src: "/static/images/swp1.png"
              })
            ]),
            vue.createElementVNode("swiper-item", null, [
              vue.createElementVNode("image", {
                mode: "widthFix",
                src: "/static/images/swp2.png"
              })
            ]),
            vue.createElementVNode("swiper-item", null, [
              vue.createElementVNode("image", {
                mode: "widthFix",
                src: "/static/images/swp3.png"
              })
            ])
          ]),
          vue.createElementVNode("image", {
            src: "/static/images/home.png",
            mode: "scaleToFill"
          }),
          vue.createElementVNode("view", {
            class: "title",
            onClick: toOrderPage
          }, "点击开始点餐")
        ]);
      };
    }
  });
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$e, [["__scopeId", "data-v-83a5a03c"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/index/index.vue"]]);
  const _imports_0 = "/static/images/login.png";
  const loginAPI = (code) => {
    return http({
      method: "POST",
      url: "/user/user/login",
      data: { code }
    });
  };
  const _sfc_main$d = /* @__PURE__ */ vue.defineComponent({
    __name: "login",
    setup(__props) {
      let code = "";
      onLoad(async () => {
        const res = await wx.login();
        code = res.code;
      });
      const login = async () => {
        formatAppLog("log", "at pages/login/login.vue:37", "login");
        const res = await loginAPI(code);
        formatAppLog("log", "at pages/login/login.vue:40", res);
        loginSuccess(res.data);
      };
      const loginSuccess = (profile) => {
        const userStore = useUserStore();
        userStore.setProfile(profile);
        uni.showToast({ icon: "success", title: "登录成功" });
        setTimeout(() => {
          uni.switchTab({ url: "/pages/my/my" });
        }, 500);
      };
      const tips = async () => {
        uni.showToast({
          title: "司辰，直接微信快捷登录就好哦~",
          icon: "none"
        });
      };
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("view", { class: "viewport" }, [
          vue.createElementVNode("view", { class: "logo" }, [
            vue.createElementVNode("image", { src: _imports_0 })
          ]),
          vue.createElementVNode("view", { class: "login" }, [
            vue.createCommentVNode(" 小程序端授权登录 "),
            vue.createElementVNode("button", {
              class: "button",
              onClick: login
            }, "微信快捷登录"),
            vue.createElementVNode("view", { class: "extra" }, [
              vue.createElementVNode("view", { class: "caption" }, [
                vue.createElementVNode("text", null, "其他登录方式")
              ]),
              vue.createElementVNode("view", { class: "options" }, [
                vue.createElementVNode("button", {
                  class: "small_btn",
                  onClick: tips
                }, "模拟快捷登录")
              ])
            ]),
            vue.createElementVNode("view", { class: "tips" }, "登录/注册即视为你同意《服务条款》和《寒夜外卖隐私协议》")
          ])
        ]);
      };
    }
  });
  const PagesLoginLogin = /* @__PURE__ */ _export_sfc(_sfc_main$d, [["__scopeId", "data-v-cdfe2409"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/login/login.vue"]]);
  const _sfc_main$c = /* @__PURE__ */ vue.defineComponent({
    __name: "detail",
    setup(__props) {
      const categoryList = vue.ref([]);
      const dish = vue.ref();
      const setmeal = vue.ref();
      const cartList = vue.ref([]);
      const visible = vue.ref(false);
      const dialogDish = vue.ref();
      const flavors = vue.ref([]);
      const chosedflavors = vue.ref([]);
      onLoad(async (options) => {
        await getCartList();
        await getCategoryData();
        const dishId = (options == null ? void 0 : options.dishId) !== void 0 ? Number(options.dishId) : void 0;
        const setmealId = (options == null ? void 0 : options.setmealId) !== void 0 ? Number(options.setmealId) : void 0;
        if (dishId !== void 0 && !Number.isNaN(dishId)) {
          formatAppLog("log", "at pages/detail/detail.vue:168", "dishId", dishId);
          await init(dishId, "dishId");
          return;
        }
        if (setmealId !== void 0 && !Number.isNaN(setmealId)) {
          formatAppLog("log", "at pages/detail/detail.vue:174", "setmealId", setmealId);
          await init(setmealId, "setmealId");
          return;
        }
        uni.showToast({
          title: "参数错误，无法获取详情",
          icon: "none"
        });
      });
      onShow(() => {
        setTimeout(() => {
          getCartList();
        }, 100);
      });
      const handleImageError = (e) => {
        formatAppLog("error", "at pages/detail/detail.vue:193", "图片加载失败", e);
        if (dish.value) {
          dish.value.pic = "/static/images/logo.png";
        } else if (setmeal.value) {
          setmeal.value.pic = "/static/images/logo.png";
        }
      };
      const init = async (id, type) => {
        try {
          let res;
          formatAppLog("log", "at pages/detail/detail.vue:204", "init", id, type);
          if (type === "dishId") {
            res = await getDishByIdAPI(id);
            if (res.code === 0) {
              dish.value = res.data;
            } else {
              uni.showToast({
                title: res.msg || "获取菜品详情失败",
                icon: "none"
              });
            }
          } else {
            res = await getSetmealAPI(id);
            if (res.code === 0) {
              setmeal.value = res.data;
            } else {
              uni.showToast({
                title: res.msg || "获取套餐详情失败",
                icon: "none"
              });
            }
          }
          formatAppLog("log", "at pages/detail/detail.vue:228", res);
          formatAppLog("log", "at pages/detail/detail.vue:229", dish.value);
          formatAppLog("log", "at pages/detail/detail.vue:230", setmeal.value);
        } catch (e) {
          formatAppLog("error", "at pages/detail/detail.vue:232", "获取详情失败", e);
          uni.showToast({
            title: "获取详情失败，请重试",
            icon: "none"
          });
        }
      };
      const getCategoryData = async () => {
        const res = await getCategoryAPI();
        categoryList.value = res.data;
      };
      const getCartList = async () => {
        const res = await getCartAPI();
        formatAppLog("log", "at pages/detail/detail.vue:247", "刷新购物车列表", res);
        cartList.value = res.data;
      };
      const getCopies = (dish2) => {
        var _a, _b;
        if (dish2 && "flavors" in dish2) {
          return ((_a = cartList.value.find((item) => item.dishId === dish2.id)) == null ? void 0 : _a.number) || 0;
        }
        return ((_b = cartList.value.find((item) => item.setmealId === dish2.id)) == null ? void 0 : _b.number) || 0;
      };
      const chooseNorm = async (dish2) => {
        flavors.value = dish2.flavors;
        const tmpdish = Object.assign({}, dish2);
        delete tmpdish.flavors;
        dialogDish.value = tmpdish;
        const moreNormdata = dish2.flavors.map((obj) => ({ ...obj, list: JSON.parse(obj.list) }));
        moreNormdata.forEach((item) => {
          if (item.list && item.list.length > 0) {
            chosedflavors.value.push(item.list[0]);
          }
        });
        visible.value = true;
      };
      const chooseFlavor = (obj, flavor) => {
        let ind = -1;
        let findst = obj.some((n) => {
          ind = chosedflavors.value.findIndex((o) => o == n);
          return ind != -1;
        });
        const indexInChosed = chosedflavors.value.findIndex((it) => it == flavor);
        if (indexInChosed == -1 && !findst) {
          chosedflavors.value.push(flavor);
        } else if (indexInChosed == -1 && findst && ind >= 0) {
          chosedflavors.value.splice(ind, 1);
          chosedflavors.value.push(flavor);
        } else {
          chosedflavors.value.splice(indexInChosed, 1);
        }
        dialogDish.value.flavors = chosedflavors.value.join(",");
      };
      const addToCart = async (dish2) => {
        if (!chosedflavors.value || chosedflavors.value.length <= 0) {
          uni.showToast({
            title: "请选择规格",
            icon: "none"
          });
          return false;
        }
        const partialCart = { dishId: dish2.id, dishFlavor: chosedflavors.value.join(",") };
        await addToCartAPI(partialCart);
        await getCartList();
        chosedflavors.value = [];
        visible.value = false;
      };
      const addDishAction = async (item, form) => {
        if (form == "菜品") {
          const partialCart = { dishId: dish.value.id };
          await addToCartAPI(partialCart);
        } else {
          const partialCart = { setmealId: setmeal.value.id };
          await addToCartAPI(partialCart);
        }
        await getCartList();
      };
      const subDishAction = async (item, form) => {
        if (form == "菜品") {
          const partialCart = { dishId: dish.value.id };
          await subCartAPI(partialCart);
        } else {
          const partialCart = { setmealId: setmeal.value.id };
          await subCartAPI(partialCart);
        }
        await getCartList();
      };
      return (_ctx, _cache) => {
        var _a, _b, _c, _d;
        return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
          vue.createCommentVNode(" 1. 顶部大图背景区域 "),
          vue.createElementVNode("view", { class: "header-banner" }, [
            vue.createCommentVNode(" 菜品图片 "),
            dish.value ? (vue.openBlock(), vue.createElementBlock("image", {
              key: 0,
              class: "banner-img",
              src: dish.value.pic || "/static/images/logo.png",
              mode: "aspectFill",
              onError: handleImageError
            }, null, 40, ["src"])) : setmeal.value ? (vue.openBlock(), vue.createElementBlock("image", {
              key: 1,
              class: "banner-img",
              src: setmeal.value.pic || "/static/images/logo.png",
              mode: "aspectFill",
              onError: handleImageError
            }, null, 40, ["src"])) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" 渐变遮罩，为了字看清楚 "),
            vue.createElementVNode("view", { class: "mask" })
          ]),
          vue.createCommentVNode(" 2. 内容卡片区域 (上浮) "),
          vue.createElementVNode("view", { class: "content-card" }, [
            vue.createCommentVNode(" A. 菜品/套餐 基础信息 "),
            dish.value || setmeal.value ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "basic-info"
            }, [
              vue.createElementVNode("view", { class: "name-row" }, [
                vue.createElementVNode(
                  "text",
                  { class: "dish-name" },
                  vue.toDisplayString(dish.value ? dish.value.name : (_a = setmeal.value) == null ? void 0 : _a.name),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "desc-row" }, [
                vue.createElementVNode(
                  "text",
                  { class: "dish-desc" },
                  vue.toDisplayString(dish.value ? dish.value.detail : (_b = setmeal.value) == null ? void 0 : _b.detail),
                  1
                  /* TEXT */
                )
              ]),
              vue.createCommentVNode(" 价格与操作行 "),
              vue.createElementVNode("view", { class: "price-action-row" }, [
                vue.createElementVNode("view", { class: "price-box" }, [
                  vue.createElementVNode("text", { class: "symbol" }, "¥"),
                  vue.createElementVNode(
                    "text",
                    { class: "num" },
                    vue.toDisplayString(dish.value ? dish.value.price : (_c = setmeal.value) == null ? void 0 : _c.price),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createCommentVNode(" 操作按钮组 "),
                vue.createElementVNode("view", { class: "action-box" }, [
                  vue.createCommentVNode(" 情况1：有多口味，选规格 "),
                  dish.value && dish.value.flavors && dish.value.flavors.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                    key: 0,
                    class: "spec-btn",
                    onClick: _cache[0] || (_cache[0] = vue.withModifiers(($event) => chooseNorm(dish.value), ["stop"]))
                  }, [
                    vue.createTextVNode(" 选规格 "),
                    getCopies(dish.value) > 0 ? (vue.openBlock(), vue.createElementBlock(
                      "view",
                      {
                        key: 0,
                        class: "badge"
                      },
                      vue.toDisplayString(getCopies(dish.value)),
                      1
                      /* TEXT */
                    )) : vue.createCommentVNode("v-if", true)
                  ])) : (vue.openBlock(), vue.createElementBlock(
                    vue.Fragment,
                    { key: 1 },
                    [
                      vue.createCommentVNode(" 情况2：无多口味，直接加减 "),
                      vue.createElementVNode("view", { class: "stepper" }, [
                        getCopies(dish.value || setmeal.value) > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                          key: 0,
                          class: "btn minus",
                          onClick: _cache[1] || (_cache[1] = vue.withModifiers(($event) => subDishAction(dish.value || setmeal.value, dish.value ? "菜品" : "套餐"), ["stop"]))
                        }, "-")) : vue.createCommentVNode("v-if", true),
                        getCopies(dish.value || setmeal.value) > 0 ? (vue.openBlock(), vue.createElementBlock(
                          "text",
                          {
                            key: 1,
                            class: "count"
                          },
                          vue.toDisplayString(getCopies(dish.value || setmeal.value)),
                          1
                          /* TEXT */
                        )) : vue.createCommentVNode("v-if", true),
                        vue.createElementVNode("view", {
                          class: "btn plus",
                          onClick: _cache[2] || (_cache[2] = vue.withModifiers(($event) => addDishAction(dish.value || setmeal.value, dish.value ? "菜品" : "套餐"), ["stop"]))
                        }, "+")
                      ])
                    ],
                    2112
                    /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
                  ))
                ])
              ])
            ])) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" B. 如果是套餐，展示包含的菜品 "),
            setmeal.value && setmeal.value.setmealDishes && setmeal.value.setmealDishes.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 1,
              class: "setmeal-list"
            }, [
              vue.createElementVNode("view", { class: "section-title" }, "套餐包含"),
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList(setmeal.value.setmealDishes, (item, index) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    class: "sub-item",
                    key: index
                  }, [
                    vue.createElementVNode("image", {
                      class: "sub-img",
                      src: item.pic,
                      mode: "aspectFill"
                    }, null, 8, ["src"]),
                    vue.createElementVNode("view", { class: "sub-info" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "sub-name" },
                        vue.toDisplayString(item.name),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode(
                        "text",
                        { class: "sub-count" },
                        "x" + vue.toDisplayString(item.copies),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode(
                        "text",
                        { class: "sub-desc" },
                        vue.toDisplayString(item.detail || "暂无描述"),
                        1
                        /* TEXT */
                      )
                    ])
                  ]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" 底部垫高，防止内容被遮挡 "),
            vue.createElementVNode("view", { style: { "height": "160rpx" } })
          ]),
          vue.createCommentVNode("\n      FIXME: 移除了底部的悬浮购物车栏(.footer-bar)和购物车列表弹窗(.cart-popup)。\n      原因：根据你的描述，这个组件只应该在外层（如菜单列表页）显示。\n      详情页本身不应该再包含一个完整的购物车列表，避免了UI遮挡和逻辑混乱问题。\n    "),
          vue.createCommentVNode(" 规格弹窗 (美化版) - 保留 "),
          visible.value ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "popup-mask",
            onClick: _cache[6] || (_cache[6] = ($event) => visible.value = false)
          }, [
            vue.createElementVNode("view", {
              class: "popup-content",
              onClick: _cache[5] || (_cache[5] = vue.withModifiers(() => {
              }, ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "popup-header" }, [
                vue.createElementVNode("text", { class: "tit" }, "选择规格"),
                vue.createElementVNode("text", {
                  class: "close",
                  onClick: _cache[3] || (_cache[3] = ($event) => visible.value = false)
                }, "×")
              ]),
              vue.createElementVNode("scroll-view", {
                "scroll-y": "",
                class: "popup-scroll"
              }, [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList(flavors.value, (flavor) => {
                    return vue.openBlock(), vue.createElementBlock("view", {
                      class: "flavor-group",
                      key: flavor.name
                    }, [
                      vue.createElementVNode(
                        "view",
                        { class: "flavor-name" },
                        vue.toDisplayString(flavor.name),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode("view", { class: "flavor-tags" }, [
                        (vue.openBlock(true), vue.createElementBlock(
                          vue.Fragment,
                          null,
                          vue.renderList(JSON.parse(flavor.list), (item, index) => {
                            return vue.openBlock(), vue.createElementBlock("view", {
                              class: vue.normalizeClass(["tag", { active: chosedflavors.value.includes(item) }]),
                              key: index,
                              onClick: ($event) => chooseFlavor(JSON.parse(flavor.list), item)
                            }, vue.toDisplayString(item), 11, ["onClick"]);
                          }),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ])
                    ]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ]),
              vue.createElementVNode("view", { class: "popup-footer" }, [
                vue.createElementVNode(
                  "view",
                  { class: "price" },
                  "¥" + vue.toDisplayString((_d = dialogDish.value) == null ? void 0 : _d.price),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("view", {
                  class: "add-cart-btn",
                  onClick: _cache[4] || (_cache[4] = ($event) => addToCart(dialogDish.value))
                }, "加入购物车")
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ]);
      };
    }
  });
  const PagesDetailDetail = /* @__PURE__ */ _export_sfc(_sfc_main$c, [["__scopeId", "data-v-9cb6f745"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/detail/detail.vue"]]);
  const addAddressAPI = (address) => {
    return http({
      method: "POST",
      url: "/user/address",
      data: address
    });
  };
  const getDefaultAddressAPI = () => {
    return http({
      method: "GET",
      url: "/user/address/default"
    });
  };
  const getAddressListAPI = () => {
    return http({
      method: "GET",
      url: "/user/address/list"
    });
  };
  const getAddressByIdAPI = (id) => {
    return http({
      method: "GET",
      url: `/user/address/${id}`
    });
  };
  const updateAddressAPI = (address) => {
    return http({
      method: "PUT",
      url: "/user/address",
      data: address
    });
  };
  const updateDefaultAddressAPI = (address) => {
    return http({
      method: "PUT",
      url: "/user/address/default",
      data: address
    });
  };
  const deleteAddressAPI = (id) => {
    return http({
      method: "DELETE",
      url: `/user/address/${id}`
    });
  };
  const useAddressStore = defineStore("address", () => {
    const addressBackUrl = vue.ref("");
    const defaultCook = vue.ref("请依据实际情况填写，避免浪费");
    function updateAddressBackUrl(provider) {
      addressBackUrl.value = provider;
    }
    return {
      addressBackUrl,
      // remark,
      defaultCook,
      updateAddressBackUrl
    };
  });
  const _sfc_main$b = /* @__PURE__ */ vue.defineComponent({
    __name: "submit",
    setup(__props) {
      const store = useAddressStore();
      const cartList = vue.ref([]);
      const CartAllNumber = vue.ref(0);
      const CartAllPrice = vue.ref(0);
      const shopConfig = vue.ref({
        id: 1,
        name: "",
        address: "",
        latitude: "",
        longitude: "",
        phone: "",
        deliveryFee: 0,
        deliveryStatus: 1,
        packFee: 0,
        packStatus: 1,
        minOrderAmount: 0,
        openingHours: "",
        notice: "",
        autoAccept: 0
      });
      vue.ref("");
      const label = vue.ref("");
      const consignee = vue.ref("");
      const phoneNumber = vue.ref("");
      const arrivalTime = vue.ref("");
      const showTimePopup = vue.ref(false);
      const selectedTimeLabel = vue.ref("立即送出");
      const timeSlots = vue.ref([]);
      const estimatedDeliveryTime = vue.ref("");
      const selectedAddrObj = vue.ref({});
      const addressId = vue.ref(0);
      const generateTimeSlots = () => {
        const slots = ["立即送出"];
        const now2 = /* @__PURE__ */ new Date();
        let start = new Date(now2.getTime() + 30 * 6e4);
        const remainder = start.getMinutes() % 15;
        start.setMinutes(start.getMinutes() + (15 - remainder));
        while (start.getHours() < 23) {
          const h = start.getHours().toString().padStart(2, "0");
          const m = start.getMinutes().toString().padStart(2, "0");
          slots.push(`${h}:${m}`);
          start.setMinutes(start.getMinutes() + 15);
        }
        timeSlots.value = slots;
      };
      const openTimePicker = () => {
        generateTimeSlots();
        showTimePopup.value = true;
      };
      const selectTime = (timeStr) => {
        selectedTimeLabel.value = timeStr;
        showTimePopup.value = false;
        const now2 = /* @__PURE__ */ new Date();
        if (timeStr === "立即送出") {
          now2.setTime(now2.getTime() + 45 * 6e4);
        } else {
          const [h, m] = timeStr.split(":");
          now2.setHours(Number(h));
          now2.setMinutes(Number(m));
        }
        estimatedDeliveryTime.value = DateToStr(now2);
      };
      const detailAddressStr = vue.computed(() => {
        if (!addressId.value)
          return "";
        const addr = selectedAddrObj.value;
        const p = !addr.provinceName || addr.provinceName === "已定位" ? "" : addr.provinceName;
        const c = !addr.cityName || addr.cityName === "已定位" ? "" : addr.cityName;
        const d = !addr.districtName || addr.districtName === "已定位" ? "" : addr.districtName;
        const detail = addr.detail || "";
        return `${p}${c}${d} ${detail}`.trim();
      });
      vue.ref("ios");
      const openCooker = vue.ref(false);
      const cookerNum = vue.ref(-2);
      const cookers = vue.ref([-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      const radioStatus = vue.ref(false);
      const remark = vue.ref("");
      const getCartList = async () => {
        try {
          const configRes = await getShopConfigAPI();
          if (configRes.code === 0 || configRes.code === 1) {
            shopConfig.value = configRes.data;
          }
        } catch (e) {
          formatAppLog("error", "at pages/submit/submit.vue:292", "获取店铺配置失败", e);
        }
        const res = await getCartAPI();
        if (res.data) {
          cartList.value = res.data;
          CartAllNumber.value = cartList.value.reduce((acc, cur) => acc + cur.number, 0);
          const goodsPrice = cartList.value.reduce((acc, cur) => acc + cur.amount * cur.number, 0);
          let packPrice = 0;
          if (shopConfig.value.packStatus === 1) {
            packPrice = CartAllNumber.value * Number(shopConfig.value.packFee);
          }
          let deliveryPrice = 0;
          if (shopConfig.value.deliveryStatus === 1) {
            deliveryPrice = Number(shopConfig.value.deliveryFee);
          }
          CartAllPrice.value = goodsPrice + packPrice + deliveryPrice;
        }
      };
      const packTotalPrice = vue.computed(() => {
        if (shopConfig.value.packStatus === 1) {
          return (CartAllNumber.value * Number(shopConfig.value.packFee)).toFixed(2);
        }
        return "0.00";
      });
      const deliveryTotalPrice = vue.computed(() => {
        if (shopConfig.value.deliveryStatus === 1) {
          return Number(shopConfig.value.deliveryFee).toFixed(2);
        }
        return "0.00";
      });
      onLoad(async (options) => {
        await getCartList();
        getHarfAnOur();
        const defaultCooker = uni.getStorageSync("default_cooker_type");
        if (defaultCooker !== "" && defaultCooker !== null && defaultCooker !== void 0) {
          cookerNum.value = Number(defaultCooker);
          radioStatus.value = true;
        } else {
          cookerNum.value = -2;
          radioStatus.value = false;
        }
      });
      onShow(async () => {
        const cacheAddr = uni.getStorageSync("select_address");
        if (cacheAddr) {
          fillAddress(cacheAddr);
          uni.removeStorageSync("select_address");
        } else {
          if (!addressId.value) {
            await getAddressBookDefault();
          }
        }
        const cacheRemark = uni.getStorageSync("order_remark");
        if (cacheRemark) {
          remark.value = cacheRemark;
          uni.removeStorageSync("order_remark");
          formatAppLog("log", "at pages/submit/submit.vue:382", "读取到备注:", remark.value);
        }
        await getCartList();
      });
      const DateToStr = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        const hours = date.getHours().toString().padStart(2, "0");
        const min = date.getMinutes().toString().padStart(2, "0");
        const second = date.getSeconds().toString().padStart(2, "0");
        return `${year}-${month}-${day} ${hours}:${min}:${second}`;
      };
      const getHarfAnOur = () => {
        const date = /* @__PURE__ */ new Date();
        date.setTime(date.getTime() + 36e5);
        const formattedDate = DateToStr(date);
        estimatedDeliveryTime.value = formattedDate;
        let hours = date.getHours();
        let minutes = date.getMinutes();
        if (hours < 10)
          hours = parseInt("0" + hours);
        if (minutes < 10)
          minutes = parseInt("0" + minutes);
        arrivalTime.value = hours + ":" + minutes;
      };
      const getAddressBookDefault = async () => {
        const res = await getDefaultAddressAPI();
        if (res.code === 0 && res.data) {
          fillAddress(res.data);
        }
      };
      const trans = (item) => {
        if (item === "公司")
          return "1";
        if (item === "家")
          return "2";
        if (item === "学校")
          return "3";
        return "4";
      };
      const goAddress = () => {
        store.addressBackUrl = "/pages/submit/submit";
        uni.navigateTo({
          url: "/pages/address/address?from=order"
        });
      };
      const goRemark = () => {
        uni.navigateTo({
          url: `/pages/remark/remark?remark=${remark.value}`
        });
      };
      const chooseCooker = () => {
        openCooker.value = true;
        if (cookerNum.value === -2) {
          cookerNum.value = 0;
        }
      };
      const getCookerInfo = () => {
        if (cookerNum.value === -2)
          return "请依据实际情况填写，避免浪费";
        else if (cookerNum.value === -1)
          return "无需餐具";
        else if (cookerNum.value === 0)
          return "商家依据餐量提供";
        else if (cookerNum.value === 11)
          return "10份以上";
        else
          return cookerNum.value + "份";
      };
      const pickerChange = (ev) => {
        const index = ev.detail.value[0];
        const selectedVal = cookers.value[index];
        cookerNum.value = selectedVal;
        if (radioStatus.value) {
          uni.setStorageSync("default_cooker_type", selectedVal);
        }
      };
      const radioChange = () => {
        radioStatus.value = !radioStatus.value;
        if (radioStatus.value) {
          if (cookerNum.value === -2) {
            cookerNum.value = 0;
          }
          uni.setStorageSync("default_cooker_type", cookerNum.value);
          uni.showToast({ title: "已记住您的偏好", icon: "none" });
        } else {
          uni.removeStorageSync("default_cooker_type");
        }
      };
      const closeMask = () => {
        openCooker.value = false;
      };
      const payOrderHandle = async () => {
        const unPayRes = await getUnPayOrderAPI();
        if (unPayRes.data !== 0) {
          return uni.showToast({ title: "有未支付订单，请先处理！", icon: "none" });
        }
        if (!addressId.value) {
          return uni.showToast({ title: "请选择收货地址", icon: "none" });
        }
        if (cookerNum.value === -2) {
          return uni.showToast({ title: "请选择餐具份数", icon: "none" });
        }
        const params = {
          payMethod: 1,
          addressId: addressId.value,
          remark: remark.value,
          deliveryStatus: selectedTimeLabel.value === "立即送出" ? 1 : 0,
          estimatedDeliveryTime: estimatedDeliveryTime.value,
          tablewareNumber: cookerNum.value,
          tablewareStatus: cookerNum.value === 0 ? 1 : 0,
          packAmount: CartAllNumber.value,
          amount: CartAllPrice.value
        };
        formatAppLog("log", "at pages/submit/submit.vue:525", "提交订单参数:", JSON.stringify(params, null, 2));
        const res = await submitOrderAPI(params);
        if (res.code === 0 || res.code === 1) {
          uni.redirectTo({
            url: `/pages/pay/pay?orderId=${res.data.id}&orderAmount=${res.data.orderAmount}&orderNumber=${res.data.orderNumber}&orderTime=${res.data.orderTime}`
          });
        } else {
          uni.showToast({ title: res.msg || "下单失败", icon: "none" });
        }
      };
      const fillAddress = (addr) => {
        if (!addr)
          return;
        addressId.value = addr.id;
        consignee.value = addr.consignee;
        phoneNumber.value = addr.phone;
        label.value = addr.label;
        selectedAddrObj.value = addr;
      };
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("view", { class: "order_content" }, [
          vue.createElementVNode("scroll-view", {
            class: "order_content_box",
            "scroll-y": "",
            "scroll-top": "0rpx"
          }, [
            vue.createCommentVNode(" 地址栏 "),
            vue.createElementVNode("view", { class: "new_address" }, [
              vue.createCommentVNode(" 上部：点击跳转地址选择 "),
              vue.createElementVNode("view", {
                class: "top",
                onClick: goAddress
              }, [
                vue.createCommentVNode(" 情况1：没有地址ID时显示提示 "),
                !addressId.value ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "address_name_disabled"
                }, " 请选择收货地址 ")) : (vue.openBlock(), vue.createElementBlock(
                  vue.Fragment,
                  { key: 1 },
                  [
                    vue.createCommentVNode(" 情况2：有地址ID时显示详情 "),
                    vue.createElementVNode("view", { class: "address_name" }, [
                      vue.createElementVNode("view", { class: "address" }, [
                        vue.createCommentVNode(" 标签 "),
                        label.value ? (vue.openBlock(), vue.createElementBlock(
                          "text",
                          {
                            key: 0,
                            class: vue.normalizeClass(["tag", "tag" + trans(label.value)])
                          },
                          vue.toDisplayString(label.value),
                          3
                          /* TEXT, CLASS */
                        )) : vue.createCommentVNode("v-if", true),
                        vue.createCommentVNode(" 核心：显示计算后的地址字符串 "),
                        vue.createElementVNode(
                          "text",
                          { class: "word" },
                          vue.toDisplayString(detailAddressStr.value),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "name" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "name_1" },
                          vue.toDisplayString(consignee.value),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode(
                          "text",
                          { class: "name_2" },
                          vue.toDisplayString(phoneNumber.value),
                          1
                          /* TEXT */
                        )
                      ])
                    ])
                  ],
                  2112
                  /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
                )),
                vue.createCommentVNode(" 右侧箭头图标 "),
                vue.createElementVNode("view", { class: "address_image" }, [
                  vue.createElementVNode("image", {
                    class: "to_right",
                    src: "/static/icon/toRight.png"
                  })
                ])
              ]),
              vue.createCommentVNode(" 下部：送达时间 "),
              vue.createElementVNode("view", {
                class: "bottom",
                onClick: openTimePicker
              }, [
                vue.createElementVNode("view", { class: "time-label" }, "送达时间"),
                vue.createElementVNode("view", { class: "time-select" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "blue-text" },
                    vue.toDisplayString(selectedTimeLabel.value),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("text", { class: "arrow" }, ">")
                ])
              ])
            ]),
            vue.createCommentVNode(" 订单内容区 "),
            vue.createElementVNode("view", { class: "order_list_cont" }, [
              vue.createCommentVNode(" 1、订单菜品列表 "),
              vue.createElementVNode("view", { class: "order_list" }, [
                vue.createElementVNode("view", { class: "word_text" }, [
                  vue.createElementVNode("text", { class: "word_style" }, "订单明细")
                ]),
                vue.createElementVNode("view", { class: "order-type" }, [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList(cartList.value, (obj, index) => {
                      return vue.openBlock(), vue.createElementBlock("view", {
                        class: "type_item",
                        key: index
                      }, [
                        vue.createElementVNode("view", { class: "dish_img" }, [
                          vue.createElementVNode("image", {
                            mode: "aspectFill",
                            src: obj.pic ? obj.pic : "/static/default_dish.png",
                            class: "dish_img_url"
                          }, null, 8, ["src"])
                        ]),
                        vue.createElementVNode("view", { class: "dish_info" }, [
                          vue.createElementVNode(
                            "view",
                            { class: "dish_name" },
                            vue.toDisplayString(obj.name),
                            1
                            /* TEXT */
                          ),
                          obj.dishFlavor ? (vue.openBlock(), vue.createElementBlock(
                            "view",
                            {
                              key: 0,
                              class: "dish_flavor"
                            },
                            vue.toDisplayString(obj.dishFlavor),
                            1
                            /* TEXT */
                          )) : vue.createCommentVNode("v-if", true),
                          vue.createElementVNode("view", { class: "dish_amount" }, [
                            obj.number && obj.number > 0 ? (vue.openBlock(), vue.createElementBlock(
                              "text",
                              {
                                key: 0,
                                class: "dish_number"
                              },
                              "x " + vue.toDisplayString(obj.number),
                              1
                              /* TEXT */
                            )) : vue.createCommentVNode("v-if", true)
                          ]),
                          vue.createElementVNode("view", { class: "dish_price" }, [
                            vue.createElementVNode("text", { class: "ico" }, "￥"),
                            vue.createTextVNode(
                              " " + vue.toDisplayString(obj.amount),
                              1
                              /* TEXT */
                            )
                          ])
                        ])
                      ]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  )),
                  vue.createElementVNode("view", { class: "word_text" }, [
                    vue.createElementVNode("view", { class: "word_left" }, "打包费"),
                    vue.createElementVNode(
                      "view",
                      { class: "word_right" },
                      "￥" + vue.toDisplayString(packTotalPrice.value),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "word_text" }, [
                    vue.createElementVNode("view", { class: "word_left" }, "配送费"),
                    vue.createElementVNode(
                      "view",
                      { class: "word_right" },
                      "￥" + vue.toDisplayString(deliveryTotalPrice.value),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "all_price" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "word_right" },
                      "总价 ￥" + vue.toDisplayString(CartAllPrice.value),
                      1
                      /* TEXT */
                    )
                  ])
                ])
              ]),
              vue.createCommentVNode(" 2、备注+餐具份数+发票 "),
              vue.createElementVNode("view", { class: "order_list" }, [
                vue.createElementVNode("view", {
                  class: "bottom_text",
                  onClick: goRemark
                }, [
                  vue.createElementVNode("view", { class: "text_left" }, "备注"),
                  vue.createElementVNode(
                    "view",
                    { class: "text_right" },
                    vue.toDisplayString(remark.value || "选择口味等"),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("view", { class: "right_image" }, [
                    vue.createElementVNode("image", {
                      class: "to_right",
                      src: "/static/icon/toRight.png"
                    })
                  ])
                ]),
                vue.createElementVNode("view", {
                  class: "bottom_text",
                  onClick: chooseCooker
                }, [
                  vue.createElementVNode("view", { class: "text_left" }, "餐具份数"),
                  vue.createElementVNode(
                    "view",
                    { class: "text_right" },
                    vue.toDisplayString(getCookerInfo()),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("view", { class: "right_image" }, [
                    vue.createElementVNode("image", {
                      class: "to_right",
                      src: "/static/icon/toRight.png"
                    })
                  ])
                ]),
                vue.createElementVNode("view", { class: "bottom_text" }, [
                  vue.createElementVNode("view", { class: "text_left" }, "发票"),
                  vue.createElementVNode("view", { class: "text_right" }, "本店不支持线上发票，请致电商家提供")
                ])
              ])
            ]),
            vue.createElementVNode("view", { class: "blank" })
          ]),
          vue.createCommentVNode(" 底部购物车 "),
          vue.createElementVNode("view", { class: "footer_order_buttom order_form" }, [
            vue.createElementVNode("view", { class: "order_number" }, [
              vue.createElementVNode("image", {
                src: "/static/images/cart_active.png",
                class: "order_number_icon"
              }),
              vue.createElementVNode(
                "view",
                { class: "order_dish_num" },
                vue.toDisplayString(CartAllNumber.value),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "order_price" }, [
              vue.createElementVNode("text", { class: "ico" }, "￥ "),
              vue.createTextVNode(
                " " + vue.toDisplayString(parseFloat((Math.round(CartAllPrice.value * 100) / 100).toFixed(2))),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "order_but" }, [
              vue.createElementVNode("view", {
                class: "order_but_rit",
                onClick: _cache[0] || (_cache[0] = ($event) => payOrderHandle())
              }, " 去支付 ")
            ])
          ]),
          vue.createElementVNode("view", { class: "mask-box" }),
          vue.createCommentVNode(" 选择餐具遮罩层 "),
          vue.withDirectives(vue.createElementVNode(
            "view",
            {
              class: "pop_mask",
              onClick: _cache[3] || (_cache[3] = ($event) => openCooker.value = !openCooker.value)
            },
            [
              vue.createElementVNode("view", {
                class: "cook_pop",
                onClick: _cache[2] || (_cache[2] = vue.withModifiers(($event) => openCooker.value = openCooker.value, ["stop"]))
              }, [
                vue.createElementVNode("view", { class: "top_title" }, [
                  vue.createElementVNode("view", { class: "title" }, " 选择餐具份数 "),
                  vue.createElementVNode("view", { class: "tips" }, " 应监管条例要求，商家不能主动提供一次性餐具 "),
                  vue.createElementVNode("view", {
                    class: "close",
                    onClick: closeMask
                  }, [
                    vue.createElementVNode("image", {
                      src: "/static/icon/close.png",
                      class: "close_img"
                    })
                  ])
                ]),
                vue.createElementVNode("picker-view", {
                  class: "picker",
                  "indicator-style": "height: 50px;",
                  value: cookers.value,
                  onChange: pickerChange
                }, [
                  vue.createElementVNode("picker-view-column", null, [
                    (vue.openBlock(true), vue.createElementBlock(
                      vue.Fragment,
                      null,
                      vue.renderList(cookers.value, (item) => {
                        return vue.openBlock(), vue.createElementBlock(
                          "view",
                          {
                            key: item,
                            style: { "line-height": "50px", "text-align": "center" }
                          },
                          vue.toDisplayString(item === -1 ? "无需餐具" : item === 0 ? "商家依据餐量提供" : item === 11 ? "10份以上" : item + "份"),
                          1
                          /* TEXT */
                        );
                      }),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ])
                ], 40, ["value"]),
                vue.createElementVNode("view", { class: "comfirm" }, [
                  vue.createElementVNode("view", { class: "after_action" }, [
                    vue.createElementVNode("label", { class: "checkbox" }, [
                      vue.createElementVNode("radio", {
                        class: "radio",
                        color: "#00aaff",
                        value: "cb",
                        checked: radioStatus.value,
                        onClick: radioChange
                      }, null, 8, ["checked"]),
                      vue.createTextVNode(
                        " " + vue.toDisplayString(cookerNum.value === -2 || cookerNum.value === -1 ? "以后都无需餐具" : "以后都需要餐具，商家依据餐量提供"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("button", {
                      class: "comfirm_btn",
                      onClick: _cache[1] || (_cache[1] = ($event) => openCooker.value = !openCooker.value)
                    }, "确定")
                  ])
                ])
              ])
            ],
            512
            /* NEED_PATCH */
          ), [
            [vue.vShow, openCooker.value]
          ]),
          vue.withDirectives(vue.createElementVNode(
            "view",
            {
              class: "pop_mask",
              onClick: _cache[5] || (_cache[5] = ($event) => showTimePopup.value = false)
            },
            [
              vue.createElementVNode("view", {
                class: "cook_pop",
                onClick: _cache[4] || (_cache[4] = vue.withModifiers(() => {
                }, ["stop"]))
              }, [
                vue.createElementVNode("view", { class: "top_title" }, [
                  vue.createElementVNode("view", { class: "title" }, "选择送达时间")
                ]),
                vue.createElementVNode("scroll-view", {
                  "scroll-y": "",
                  style: { "height": "500rpx" }
                }, [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList(timeSlots.value, (item, index) => {
                      return vue.openBlock(), vue.createElementBlock("view", {
                        class: "time-item",
                        key: index,
                        onClick: ($event) => selectTime(item)
                      }, [
                        vue.createElementVNode(
                          "text",
                          {
                            class: vue.normalizeClass({ active: selectedTimeLabel.value === item })
                          },
                          vue.toDisplayString(item),
                          3
                          /* TEXT, CLASS */
                        ),
                        selectedTimeLabel.value === item ? (vue.openBlock(), vue.createElementBlock("text", {
                          key: 0,
                          class: "check"
                        }, "✔")) : vue.createCommentVNode("v-if", true)
                      ], 8, ["onClick"]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ])
            ],
            512
            /* NEED_PATCH */
          ), [
            [vue.vShow, showTimePopup.value]
          ])
        ]);
      };
    }
  });
  const PagesSubmitSubmit = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["__scopeId", "data-v-fb87e98c"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/submit/submit.vue"]]);
  const _sfc_main$a = /* @__PURE__ */ vue.defineComponent({
    __name: "success",
    setup(__props) {
      const orderId = vue.ref(0);
      const orderNumber = vue.ref("");
      const orderAmount = vue.ref(0);
      const orderTime = vue.ref("");
      const arrivalTime = vue.ref("");
      onLoad(async (options) => {
        formatAppLog("log", "at pages/submit/success.vue:25", "options", options);
        orderId.value = options.orderId;
        orderNumber.value = options.orderNumber;
        orderAmount.value = options.orderAmount;
        orderTime.value = options.orderTime;
        getHarfAnOur();
      });
      const getHarfAnOur = () => {
        const date = /* @__PURE__ */ new Date();
        date.setTime(date.getTime() + 36e5);
        let hours = date.getHours().toString();
        let minutes = date.getMinutes().toString();
        if (hours.length === 1)
          hours = "0" + hours;
        if (minutes.length === 1)
          minutes = "0" + minutes;
        arrivalTime.value = hours + ":" + minutes;
      };
      const toHome = () => {
        uni.switchTab({
          url: "/pages/order/order"
        });
      };
      const toDetail = () => {
        uni.redirectTo({
          url: "/pages/orderDetail/orderDetail?orderId=" + orderId.value
        });
      };
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
          vue.createElementVNode("image", {
            src: "/static/icon/饿饿.png",
            mode: "scaleToFill"
          }),
          vue.createElementVNode("view", { class: "pay" }, "支付成功"),
          vue.createElementVNode(
            "view",
            { class: "time" },
            "预计" + vue.toDisplayString(arrivalTime.value) + "送达",
            1
            /* TEXT */
          ),
          vue.createElementVNode("view", { class: "success_desc" }, " 后厨疯狂备餐ing, 请耐心等待~ "),
          vue.createElementVNode("view", { class: "btn_box" }, [
            vue.createElementVNode("button", {
              class: "return_btn",
              onClick: _cache[0] || (_cache[0] = ($event) => toHome())
            }, "返回首页"),
            vue.createElementVNode("button", {
              class: "detail_btn",
              onClick: _cache[1] || (_cache[1] = ($event) => toDetail())
            }, "查看订单")
          ])
        ]);
      };
    }
  });
  const PagesSubmitSuccess = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["__scopeId", "data-v-03f045ab"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/submit/success.vue"]]);
  const _sfc_main$9 = /* @__PURE__ */ vue.defineComponent({
    __name: "Empty",
    props: {
      isSearch: {
        type: Boolean,
        default: false
      }
    },
    setup(__props) {
      const props = __props;
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("div", { class: "empty-box" }, [
          vue.createElementVNode("div", { class: "img-box" }, [
            vue.createElementVNode("img", {
              src: "/static/images/table_empty.png",
              alt: ""
            }),
            vue.createElementVNode(
              "p",
              null,
              vue.toDisplayString(!props.isSearch ? "这里空空如也~" : "Sorry，木有找到您搜索的内容哦~"),
              1
              /* TEXT */
            )
          ])
        ]);
      };
    }
  });
  const Empty = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["__scopeId", "data-v-aaa00962"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/components/empty/Empty.vue"]]);
  const _sfc_main$8 = /* @__PURE__ */ vue.defineComponent({
    __name: "address",
    setup(__props) {
      const store = useAddressStore();
      const addressList = vue.ref([]);
      store.addressBackUrl;
      const isFromOrder = vue.ref(false);
      onShow(() => {
        getAddressList();
      });
      onLoad((options) => {
        if ((options == null ? void 0 : options.from) === "order") {
          isFromOrder.value = true;
        }
      });
      const getAddressList = async () => {
        try {
          const res = await getAddressListAPI();
          if (res.code === 1 || res.code === 0) {
            addressList.value = res.data || [];
          }
        } catch (e) {
          formatAppLog("error", "at pages/address/address.vue:103", "获取列表失败", e);
          uni.showToast({ title: "加载失败", icon: "none" });
        }
      };
      const onAdd = () => {
        uni.navigateTo({
          url: "/pages/addOrEditAddress/addOrEditAddress"
        });
      };
      const onEdit = (item) => {
        uni.navigateTo({
          url: "/pages/addOrEditAddress/addOrEditAddress?type=编辑&id=" + item.id
        });
      };
      const onDelete = (item) => {
        uni.showModal({
          title: "提示",
          content: "确定要删除该地址吗？",
          success: async (res) => {
            if (res.confirm) {
              try {
                const apiRes = await deleteAddressAPI(item.id);
                if (apiRes.code === 1 || apiRes.code === 0) {
                  uni.showToast({ title: "删除成功", icon: "none" });
                  getAddressList();
                } else {
                  uni.showToast({ title: apiRes.msg || "删除失败", icon: "none" });
                }
              } catch (e) {
                uni.showToast({ title: "删除出错", icon: "none" });
              }
            }
          }
        });
      };
      const setDefault = async (item) => {
        try {
          const res = await updateDefaultAddressAPI({ id: item.id });
          if (res.code === 1 || res.code === 0) {
            uni.showToast({ title: "设置成功", icon: "none" });
            getAddressList();
          }
        } catch (e) {
          formatAppLog("error", "at pages/address/address.vue:155", "设置默认失败", e);
        }
      };
      const choseAddress = (item) => {
        if (!isFromOrder.value) {
          return;
        }
        uni.setStorageSync("select_address", item);
        uni.navigateBack({
          delta: 1
        });
      };
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("view", { class: "list-container" }, [
          vue.createElementVNode("scroll-view", {
            "scroll-y": "",
            class: "scroll-box"
          }, [
            vue.createCommentVNode(" 列表区域 "),
            addressList.value && addressList.value.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", { key: 0 }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList(addressList.value, (item, index) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    class: "address-card",
                    key: index
                  }, [
                    vue.createCommentVNode(" 点击卡片：选中地址 (仅从下单页跳转来时有效) "),
                    vue.createElementVNode("view", {
                      class: "card-content",
                      onClick: ($event) => choseAddress(item)
                    }, [
                      vue.createElementVNode("view", { class: "info-row" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "name" },
                          vue.toDisplayString(item.consignee),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode(
                          "text",
                          { class: "phone" },
                          vue.toDisplayString(item.phone),
                          1
                          /* TEXT */
                        ),
                        item.label ? (vue.openBlock(), vue.createElementBlock(
                          "text",
                          {
                            key: 0,
                            class: "tag"
                          },
                          vue.toDisplayString(item.label),
                          1
                          /* TEXT */
                        )) : vue.createCommentVNode("v-if", true)
                      ]),
                      vue.createElementVNode("view", { class: "address-row" }, [
                        vue.createCommentVNode(" 改为显示：地图选的点 + 门牌号 "),
                        vue.createElementVNode(
                          "text",
                          { style: { "font-weight": "bold", "margin-right": "10rpx" } },
                          vue.toDisplayString(item.districtName),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode(
                          "text",
                          null,
                          vue.toDisplayString(item.detail),
                          1
                          /* TEXT */
                        )
                      ])
                    ], 8, ["onClick"]),
                    vue.createCommentVNode(" 分割线 "),
                    vue.createElementVNode("view", { class: "line" }),
                    vue.createCommentVNode(" 操作区域 "),
                    vue.createElementVNode("view", { class: "action-bar" }, [
                      vue.createCommentVNode(" 设为默认按钮 "),
                      vue.createElementVNode("view", {
                        class: "radio-box",
                        onClick: vue.withModifiers(($event) => setDefault(item), ["stop"])
                      }, [
                        vue.createElementVNode("radio", {
                          checked: item.isDefault === 1,
                          color: "#00aaff",
                          style: { "transform": "scale(0.7)" },
                          onClick: vue.withModifiers(($event) => setDefault(item), ["stop"])
                        }, null, 8, ["checked", "onClick"]),
                        vue.createElementVNode("text", null, "默认地址")
                      ], 8, ["onClick"]),
                      vue.createCommentVNode(" 编辑/删除按钮 "),
                      vue.createElementVNode("view", { class: "btn-group" }, [
                        vue.createElementVNode("view", {
                          class: "action-btn",
                          onClick: vue.withModifiers(($event) => onEdit(item), ["stop"])
                        }, [
                          vue.createElementVNode("image", {
                            src: "/static/icon/edit.png",
                            class: "icon"
                          }),
                          vue.createElementVNode("text", null, "编辑")
                        ], 8, ["onClick"]),
                        vue.createElementVNode("view", {
                          class: "action-btn delete",
                          onClick: vue.withModifiers(($event) => onDelete(item), ["stop"])
                        }, [
                          vue.createElementVNode("image", {
                            src: "/static/icon/delete.png",
                            class: "icon"
                          }),
                          vue.createElementVNode("text", null, "删除")
                        ], 8, ["onClick"])
                      ])
                    ])
                  ]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : (vue.openBlock(), vue.createElementBlock(
              vue.Fragment,
              { key: 1 },
              [
                vue.createCommentVNode(" 空状态 "),
                vue.createVNode(Empty, { textLabel: "暂无收货地址" })
              ],
              2112
              /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
            )),
            vue.createCommentVNode(" 底部占位，防止被按钮遮挡 "),
            vue.createElementVNode("view", { style: { "height": "120rpx" } })
          ]),
          vue.createCommentVNode(" 底部按钮 "),
          vue.createElementVNode("view", { class: "bottom-fixed" }, [
            vue.createElementVNode("button", {
              class: "add-btn",
              onClick: onAdd
            }, "+ 新增收货地址")
          ])
        ]);
      };
    }
  });
  const PagesAddressAddress = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["__scopeId", "data-v-2312e3da"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/address/address.vue"]]);
  const _sfc_main$7 = /* @__PURE__ */ vue.defineComponent({
    __name: "addOrEditAddress",
    setup(__props) {
      vue.ref("ios");
      vue.ref(false);
      const items = [
        {
          value: 1,
          name: "男士"
        },
        {
          value: 0,
          name: "女士"
        }
      ];
      const options = [
        {
          name: "公司"
        },
        {
          name: "家"
        },
        {
          name: "学校"
        }
      ];
      const form = vue.reactive({
        id: 0,
        consignee: "",
        phone: "",
        label: "家",
        gender: 1,
        // 逻辑拆分：
        provinceName: "已定位",
        // 默认值，防止后端校验
        cityName: "已定位",
        // 默认值
        districtName: "",
        // 【重点】用来存地图选点的“建筑名”
        detail: "",
        // 【重点】用来存用户填写的“门牌号”
        latitude: "",
        longitude: ""
      });
      vue.ref("");
      const address = vue.ref("");
      vue.ref();
      vue.computed(() => {
        return form.latitude && form.longitude && address.value;
      });
      onLoad(async (opt) => {
        const id = (opt == null ? void 0 : opt.id) !== void 0 ? Number(opt.id) : void 0;
        if (id !== void 0 && !Number.isNaN(id)) {
          uni.setNavigationBarTitle({ title: "修改收货地址" });
          const res = await getAddressByIdAPI(id);
          if (res.code === 1 || res.code === 0) {
            Object.assign(form, res.data);
            if (!form.districtName)
              form.districtName = "";
          }
        } else {
          uni.setNavigationBarTitle({ title: "新增收货地址" });
        }
      });
      onUnload(() => {
        uni.removeStorage({
          key: "edit"
        });
      });
      const chooseLocationFromMap = () => {
        uni.chooseLocation({
          success: (res) => {
            formatAppLog("log", "at pages/addOrEditAddress/addOrEditAddress.vue:234", "选点结果", res);
            form.latitude = String(res.latitude);
            form.longitude = String(res.longitude);
            form.districtName = res.name || res.address;
            form.provinceName = "已定位";
            form.cityName = "已定位";
          }
        });
      };
      const saveAddress = async () => {
        if (!form.consignee)
          return uni.showToast({ title: "请填写联系人", icon: "none" });
        if (!form.phone)
          return uni.showToast({ title: "请填写手机号", icon: "none" });
        if (!/^1[3-9]\d{9}$/.test(form.phone))
          return uni.showToast({ title: "手机号格式错误", icon: "none" });
        if (!form.districtName || form.districtName === "已定位") {
          return uni.showToast({ title: "请点击选择收货地址", icon: "none" });
        }
        if (!form.detail) {
          return uni.showToast({ title: "请填写门牌号", icon: "none" });
        }
        const api = form.id ? updateAddressAPI : addAddressAPI;
        const res = await api(form);
        if (res.code === 1 || res.code === 0) {
          uni.showToast({ title: "保存成功" });
          setTimeout(() => uni.navigateBack(), 800);
        } else {
          uni.showToast({ title: res.msg || "保存失败", icon: "none" });
        }
      };
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("view", { class: "page-container" }, [
          vue.createElementVNode("view", { class: "card-box" }, [
            vue.createCommentVNode(" 联系人 "),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("view", { class: "label" }, "联系人"),
              vue.createElementVNode("view", { class: "input-box" }, [
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "uni-input",
                    "placeholder-class": "placeholder",
                    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => form.consignee = $event),
                    placeholder: "请填写收货人"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, form.consignee]
                ]),
                vue.createElementVNode("view", { class: "gender-radio" }, [
                  (vue.openBlock(), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList(items, (item, index) => {
                      return vue.createElementVNode("view", {
                        class: vue.normalizeClass(["radio-tag", { active: form.gender === item.value }]),
                        key: index,
                        onClick: ($event) => form.gender = item.value
                      }, vue.toDisplayString(item.name), 11, ["onClick"]);
                    }),
                    64
                    /* STABLE_FRAGMENT */
                  ))
                ])
              ])
            ]),
            vue.createCommentVNode(" 手机号 "),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("view", { class: "label" }, "手机号"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "uni-input",
                  type: "number",
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => form.phone = $event),
                  placeholder: "请填写收货手机号",
                  maxlength: 11
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, form.phone]
              ])
            ]),
            vue.createCommentVNode(" 地图选点 (存入 districtName) "),
            vue.createElementVNode("view", {
              class: "form-row map-row",
              onClick: chooseLocationFromMap
            }, [
              vue.createElementVNode("view", { class: "label" }, "收货地址"),
              vue.createElementVNode("view", { class: "map-box" }, [
                vue.createElementVNode("image", {
                  src: "/static/icon/location.png",
                  class: "map-icon",
                  mode: "aspectFit"
                }),
                vue.createElementVNode("view", { class: "map-text-box" }, [
                  vue.createCommentVNode(" 显示 districtName 作为地图定位点 "),
                  form.districtName && form.districtName !== "已定位" ? (vue.openBlock(), vue.createElementBlock(
                    "text",
                    {
                      key: 0,
                      class: "addr-text"
                    },
                    vue.toDisplayString(form.districtName),
                    1
                    /* TEXT */
                  )) : (vue.openBlock(), vue.createElementBlock("text", {
                    key: 1,
                    class: "placeholder"
                  }, "点击定位收货地址"))
                ]),
                vue.createElementVNode("text", { class: "arrow" }, ">")
              ])
            ]),
            vue.createCommentVNode(" 门牌号 (存入 detail) "),
            vue.createElementVNode("view", { class: "form-row no-border" }, [
              vue.createElementVNode("view", { class: "label" }, "门牌号"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "uni-input",
                  "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => form.detail = $event),
                  placeholder: "例：8号楼 502室"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, form.detail]
              ])
            ]),
            vue.createCommentVNode(" 标签 "),
            vue.createElementVNode("view", { class: "form-row tag-row" }, [
              vue.createElementVNode("view", { class: "label" }, "标签"),
              vue.createElementVNode("view", { class: "tag-list" }, [
                (vue.openBlock(), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList(options, (item) => {
                    return vue.createElementVNode("view", {
                      class: vue.normalizeClass(["tag-item", { active: form.label === item.name }]),
                      key: item.name,
                      onClick: ($event) => form.label = item.name
                    }, vue.toDisplayString(item.name), 11, ["onClick"]);
                  }),
                  64
                  /* STABLE_FRAGMENT */
                ))
              ])
            ])
          ]),
          vue.createElementVNode("view", { class: "footer-btn" }, [
            vue.createElementVNode("button", {
              class: "btn-save",
              onClick: saveAddress
            }, "保存地址")
          ])
        ]);
      };
    }
  });
  const PagesAddOrEditAddressAddOrEditAddress = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["__scopeId", "data-v-06210029"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/addOrEditAddress/addOrEditAddress.vue"]]);
  const _sfc_main$6 = /* @__PURE__ */ vue.defineComponent({
    __name: "remark",
    setup(__props) {
      const remark = vue.ref("");
      onLoad((options) => {
        if (options && options.remark) {
          remark.value = options.remark;
        }
      });
      onShow(async () => {
        const cacheRemark = uni.getStorageSync("order_remark");
        if (cacheRemark) {
          remark.value = cacheRemark;
          uni.removeStorageSync("order_remark");
        }
      });
      const returnToSubmit = () => {
        formatAppLog("log", "at pages/remark/remark.vue:39", "remark", remark.value);
        uni.setStorageSync("order_remark", remark.value);
        uni.navigateBack({
          delta: 1
        });
      };
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock(
          vue.Fragment,
          null,
          [
            vue.createElementVNode("view", { class: "uni-textarea" }, [
              vue.withDirectives(vue.createElementVNode(
                "textarea",
                {
                  class: "remark_text",
                  "placeholder-class": "textarea-placeholder",
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => remark.value = $event),
                  maxlength: 50,
                  placeholder: "请输入您需要备注的信息"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, remark.value]
              ]),
              vue.createElementVNode(
                "view",
                { class: "fifty" },
                vue.toDisplayString(remark.value.length) + " / 50",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "add_address" }, [
              vue.createElementVNode("button", {
                class: "add_btn",
                plain: true,
                onClick: _cache[1] || (_cache[1] = ($event) => returnToSubmit())
              }, "完成")
            ])
          ],
          64
          /* STABLE_FRAGMENT */
        );
      };
    }
  });
  const PagesRemarkRemark = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["__scopeId", "data-v-cc1c9952"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/remark/remark.vue"]]);
  const isObject$1 = (val) => val !== null && typeof val === "object";
  const defaultDelimiters = ["{", "}"];
  class BaseFormatter {
    constructor() {
      this._caches = /* @__PURE__ */ Object.create(null);
    }
    interpolate(message, values, delimiters = defaultDelimiters) {
      if (!values) {
        return [message];
      }
      let tokens = this._caches[message];
      if (!tokens) {
        tokens = parse(message, delimiters);
        this._caches[message] = tokens;
      }
      return compile(tokens, values);
    }
  }
  const RE_TOKEN_LIST_VALUE = /^(?:\d)+/;
  const RE_TOKEN_NAMED_VALUE = /^(?:\w)+/;
  function parse(format, [startDelimiter, endDelimiter]) {
    const tokens = [];
    let position = 0;
    let text = "";
    while (position < format.length) {
      let char = format[position++];
      if (char === startDelimiter) {
        if (text) {
          tokens.push({ type: "text", value: text });
        }
        text = "";
        let sub = "";
        char = format[position++];
        while (char !== void 0 && char !== endDelimiter) {
          sub += char;
          char = format[position++];
        }
        const isClosed = char === endDelimiter;
        const type = RE_TOKEN_LIST_VALUE.test(sub) ? "list" : isClosed && RE_TOKEN_NAMED_VALUE.test(sub) ? "named" : "unknown";
        tokens.push({ value: sub, type });
      } else {
        text += char;
      }
    }
    text && tokens.push({ type: "text", value: text });
    return tokens;
  }
  function compile(tokens, values) {
    const compiled = [];
    let index = 0;
    const mode = Array.isArray(values) ? "list" : isObject$1(values) ? "named" : "unknown";
    if (mode === "unknown") {
      return compiled;
    }
    while (index < tokens.length) {
      const token = tokens[index];
      switch (token.type) {
        case "text":
          compiled.push(token.value);
          break;
        case "list":
          compiled.push(values[parseInt(token.value, 10)]);
          break;
        case "named":
          if (mode === "named") {
            compiled.push(values[token.value]);
          } else {
            {
              console.warn(`Type of token '${token.type}' and format of value '${mode}' don't match!`);
            }
          }
          break;
        case "unknown":
          {
            console.warn(`Detect 'unknown' type of token!`);
          }
          break;
      }
      index++;
    }
    return compiled;
  }
  const LOCALE_ZH_HANS = "zh-Hans";
  const LOCALE_ZH_HANT = "zh-Hant";
  const LOCALE_EN = "en";
  const LOCALE_FR = "fr";
  const LOCALE_ES = "es";
  const hasOwnProperty = Object.prototype.hasOwnProperty;
  const hasOwn = (val, key) => hasOwnProperty.call(val, key);
  const defaultFormatter = new BaseFormatter();
  function include(str, parts) {
    return !!parts.find((part) => str.indexOf(part) !== -1);
  }
  function startsWith(str, parts) {
    return parts.find((part) => str.indexOf(part) === 0);
  }
  function normalizeLocale(locale, messages2) {
    if (!locale) {
      return;
    }
    locale = locale.trim().replace(/_/g, "-");
    if (messages2 && messages2[locale]) {
      return locale;
    }
    locale = locale.toLowerCase();
    if (locale === "chinese") {
      return LOCALE_ZH_HANS;
    }
    if (locale.indexOf("zh") === 0) {
      if (locale.indexOf("-hans") > -1) {
        return LOCALE_ZH_HANS;
      }
      if (locale.indexOf("-hant") > -1) {
        return LOCALE_ZH_HANT;
      }
      if (include(locale, ["-tw", "-hk", "-mo", "-cht"])) {
        return LOCALE_ZH_HANT;
      }
      return LOCALE_ZH_HANS;
    }
    let locales = [LOCALE_EN, LOCALE_FR, LOCALE_ES];
    if (messages2 && Object.keys(messages2).length > 0) {
      locales = Object.keys(messages2);
    }
    const lang = startsWith(locale, locales);
    if (lang) {
      return lang;
    }
  }
  class I18n {
    constructor({ locale, fallbackLocale, messages: messages2, watcher, formater }) {
      this.locale = LOCALE_EN;
      this.fallbackLocale = LOCALE_EN;
      this.message = {};
      this.messages = {};
      this.watchers = [];
      if (fallbackLocale) {
        this.fallbackLocale = fallbackLocale;
      }
      this.formater = formater || defaultFormatter;
      this.messages = messages2 || {};
      this.setLocale(locale || LOCALE_EN);
      if (watcher) {
        this.watchLocale(watcher);
      }
    }
    setLocale(locale) {
      const oldLocale = this.locale;
      this.locale = normalizeLocale(locale, this.messages) || this.fallbackLocale;
      if (!this.messages[this.locale]) {
        this.messages[this.locale] = {};
      }
      this.message = this.messages[this.locale];
      if (oldLocale !== this.locale) {
        this.watchers.forEach((watcher) => {
          watcher(this.locale, oldLocale);
        });
      }
    }
    getLocale() {
      return this.locale;
    }
    watchLocale(fn) {
      const index = this.watchers.push(fn) - 1;
      return () => {
        this.watchers.splice(index, 1);
      };
    }
    add(locale, message, override = true) {
      const curMessages = this.messages[locale];
      if (curMessages) {
        if (override) {
          Object.assign(curMessages, message);
        } else {
          Object.keys(message).forEach((key) => {
            if (!hasOwn(curMessages, key)) {
              curMessages[key] = message[key];
            }
          });
        }
      } else {
        this.messages[locale] = message;
      }
    }
    f(message, values, delimiters) {
      return this.formater.interpolate(message, values, delimiters).join("");
    }
    t(key, locale, values) {
      let message = this.message;
      if (typeof locale === "string") {
        locale = normalizeLocale(locale, this.messages);
        locale && (message = this.messages[locale]);
      } else {
        values = locale;
      }
      if (!hasOwn(message, key)) {
        console.warn(`Cannot translate the value of keypath ${key}. Use the value of keypath as default.`);
        return key;
      }
      return this.formater.interpolate(message[key], values).join("");
    }
  }
  function watchAppLocale(appVm, i18n) {
    if (appVm.$watchLocale) {
      appVm.$watchLocale((newLocale) => {
        i18n.setLocale(newLocale);
      });
    } else {
      appVm.$watch(() => appVm.$locale, (newLocale) => {
        i18n.setLocale(newLocale);
      });
    }
  }
  function getDefaultLocale() {
    if (typeof uni !== "undefined" && uni.getLocale) {
      return uni.getLocale();
    }
    if (typeof global !== "undefined" && global.getLocale) {
      return global.getLocale();
    }
    return LOCALE_EN;
  }
  function initVueI18n(locale, messages2 = {}, fallbackLocale, watcher) {
    if (typeof locale !== "string") {
      [locale, messages2] = [
        messages2,
        locale
      ];
    }
    if (typeof locale !== "string") {
      locale = getDefaultLocale();
    }
    if (typeof fallbackLocale !== "string") {
      fallbackLocale = typeof __uniConfig !== "undefined" && __uniConfig.fallbackLocale || LOCALE_EN;
    }
    const i18n = new I18n({
      locale,
      fallbackLocale,
      messages: messages2,
      watcher
    });
    let t2 = (key, values) => {
      if (typeof getApp !== "function") {
        t2 = function(key2, values2) {
          return i18n.t(key2, values2);
        };
      } else {
        let isWatchedAppLocale = false;
        t2 = function(key2, values2) {
          const appVm = getApp().$vm;
          if (appVm) {
            appVm.$locale;
            if (!isWatchedAppLocale) {
              isWatchedAppLocale = true;
              watchAppLocale(appVm, i18n);
            }
          }
          return i18n.t(key2, values2);
        };
      }
      return t2(key, values);
    };
    return {
      i18n,
      f(message, values, delimiters) {
        return i18n.f(message, values, delimiters);
      },
      t(key, values) {
        return t2(key, values);
      },
      add(locale2, message, override = true) {
        return i18n.add(locale2, message, override);
      },
      watch(fn) {
        return i18n.watchLocale(fn);
      },
      getLocale() {
        return i18n.getLocale();
      },
      setLocale(newLocale) {
        return i18n.setLocale(newLocale);
      }
    };
  }
  const en = {
    "uni-countdown.day": "day",
    "uni-countdown.h": "h",
    "uni-countdown.m": "m",
    "uni-countdown.s": "s"
  };
  const zhHans = {
    "uni-countdown.day": "天",
    "uni-countdown.h": "时",
    "uni-countdown.m": "分",
    "uni-countdown.s": "秒"
  };
  const zhHant = {
    "uni-countdown.day": "天",
    "uni-countdown.h": "時",
    "uni-countdown.m": "分",
    "uni-countdown.s": "秒"
  };
  const messages = {
    en,
    "zh-Hans": zhHans,
    "zh-Hant": zhHant
  };
  const {
    t
  } = initVueI18n(messages);
  const _sfc_main$5 = {
    name: "UniCountdown",
    emits: ["timeup"],
    props: {
      showDay: {
        type: Boolean,
        default: true
      },
      showHour: {
        type: Boolean,
        default: true
      },
      showMinute: {
        type: Boolean,
        default: true
      },
      showColon: {
        type: Boolean,
        default: true
      },
      start: {
        type: Boolean,
        default: true
      },
      backgroundColor: {
        type: String,
        default: ""
      },
      color: {
        type: String,
        default: "#333"
      },
      fontSize: {
        type: Number,
        default: 14
      },
      splitorColor: {
        type: String,
        default: "#333"
      },
      day: {
        type: Number,
        default: 0
      },
      hour: {
        type: Number,
        default: 0
      },
      minute: {
        type: Number,
        default: 0
      },
      second: {
        type: Number,
        default: 0
      },
      timestamp: {
        type: Number,
        default: 0
      }
    },
    data() {
      return {
        timer: null,
        syncFlag: false,
        d: "00",
        h: "00",
        i: "00",
        s: "00",
        leftTime: 0,
        seconds: 0
      };
    },
    computed: {
      dayText() {
        return t("uni-countdown.day");
      },
      hourText(val) {
        return t("uni-countdown.h");
      },
      minuteText(val) {
        return t("uni-countdown.m");
      },
      secondText(val) {
        return t("uni-countdown.s");
      },
      timeStyle() {
        const {
          color,
          backgroundColor,
          fontSize
        } = this;
        return {
          color,
          backgroundColor,
          fontSize: `${fontSize}px`,
          width: `${fontSize * 22 / 14}px`,
          // 按字体大小为 14px 时的比例缩放
          lineHeight: `${fontSize * 20 / 14}px`,
          borderRadius: `${fontSize * 3 / 14}px`
        };
      },
      splitorStyle() {
        const { splitorColor, fontSize, backgroundColor } = this;
        return {
          color: splitorColor,
          fontSize: `${fontSize * 12 / 14}px`,
          margin: backgroundColor ? `${fontSize * 4 / 14}px` : ""
        };
      }
    },
    watch: {
      day(val) {
        this.changeFlag();
      },
      hour(val) {
        this.changeFlag();
      },
      minute(val) {
        this.changeFlag();
      },
      second(val) {
        this.changeFlag();
      },
      start: {
        immediate: true,
        handler(newVal, oldVal) {
          if (newVal) {
            this.startData();
          } else {
            if (!oldVal)
              return;
            clearInterval(this.timer);
          }
        }
      }
    },
    created: function(e) {
      this.seconds = this.toSeconds(this.timestamp, this.day, this.hour, this.minute, this.second);
      this.countDown();
    },
    unmounted() {
      clearInterval(this.timer);
    },
    methods: {
      toSeconds(timestamp, day, hours, minutes, seconds) {
        if (timestamp) {
          return timestamp - parseInt((/* @__PURE__ */ new Date()).getTime() / 1e3, 10);
        }
        return day * 60 * 60 * 24 + hours * 60 * 60 + minutes * 60 + seconds;
      },
      timeUp() {
        clearInterval(this.timer);
        this.$emit("timeup");
      },
      countDown() {
        let seconds = this.seconds;
        let [day, hour, minute, second] = [0, 0, 0, 0];
        if (seconds > 0) {
          day = Math.floor(seconds / (60 * 60 * 24));
          hour = Math.floor(seconds / (60 * 60)) - day * 24;
          minute = Math.floor(seconds / 60) - day * 24 * 60 - hour * 60;
          second = Math.floor(seconds) - day * 24 * 60 * 60 - hour * 60 * 60 - minute * 60;
        } else {
          this.timeUp();
        }
        if (day < 10) {
          day = "0" + day;
        }
        if (hour < 10) {
          hour = "0" + hour;
        }
        if (minute < 10) {
          minute = "0" + minute;
        }
        if (second < 10) {
          second = "0" + second;
        }
        this.d = day;
        this.h = hour;
        this.i = minute;
        this.s = second;
      },
      startData() {
        this.seconds = this.toSeconds(this.timestamp, this.day, this.hour, this.minute, this.second);
        if (this.seconds <= 0) {
          this.seconds = this.toSeconds(0, 0, 0, 0, 0);
          this.countDown();
          return;
        }
        clearInterval(this.timer);
        this.countDown();
        this.timer = setInterval(() => {
          this.seconds--;
          if (this.seconds < 0) {
            this.timeUp();
            return;
          }
          this.countDown();
        }, 1e3);
      },
      update() {
        this.startData();
      },
      changeFlag() {
        if (!this.syncFlag) {
          this.seconds = this.toSeconds(this.timestamp, this.day, this.hour, this.minute, this.second);
          this.startData();
          this.syncFlag = true;
        }
      }
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "uni-countdown" }, [
      $props.showDay ? (vue.openBlock(), vue.createElementBlock(
        "text",
        {
          key: 0,
          style: vue.normalizeStyle([$options.timeStyle]),
          class: "uni-countdown__number"
        },
        vue.toDisplayString($data.d),
        5
        /* TEXT, STYLE */
      )) : vue.createCommentVNode("v-if", true),
      $props.showDay ? (vue.openBlock(), vue.createElementBlock(
        "text",
        {
          key: 1,
          style: vue.normalizeStyle([$options.splitorStyle]),
          class: "uni-countdown__splitor"
        },
        vue.toDisplayString($options.dayText),
        5
        /* TEXT, STYLE */
      )) : vue.createCommentVNode("v-if", true),
      $props.showHour ? (vue.openBlock(), vue.createElementBlock(
        "text",
        {
          key: 2,
          style: vue.normalizeStyle([$options.timeStyle]),
          class: "uni-countdown__number"
        },
        vue.toDisplayString($data.h),
        5
        /* TEXT, STYLE */
      )) : vue.createCommentVNode("v-if", true),
      $props.showHour ? (vue.openBlock(), vue.createElementBlock(
        "text",
        {
          key: 3,
          style: vue.normalizeStyle([$options.splitorStyle]),
          class: "uni-countdown__splitor"
        },
        vue.toDisplayString($props.showColon ? ":" : $options.hourText),
        5
        /* TEXT, STYLE */
      )) : vue.createCommentVNode("v-if", true),
      $props.showMinute ? (vue.openBlock(), vue.createElementBlock(
        "text",
        {
          key: 4,
          style: vue.normalizeStyle([$options.timeStyle]),
          class: "uni-countdown__number"
        },
        vue.toDisplayString($data.i),
        5
        /* TEXT, STYLE */
      )) : vue.createCommentVNode("v-if", true),
      $props.showMinute ? (vue.openBlock(), vue.createElementBlock(
        "text",
        {
          key: 5,
          style: vue.normalizeStyle([$options.splitorStyle]),
          class: "uni-countdown__splitor"
        },
        vue.toDisplayString($props.showColon ? ":" : $options.minuteText),
        5
        /* TEXT, STYLE */
      )) : vue.createCommentVNode("v-if", true),
      vue.createElementVNode(
        "text",
        {
          style: vue.normalizeStyle([$options.timeStyle]),
          class: "uni-countdown__number"
        },
        vue.toDisplayString($data.s),
        5
        /* TEXT, STYLE */
      ),
      !$props.showColon ? (vue.openBlock(), vue.createElementBlock(
        "text",
        {
          key: 6,
          style: vue.normalizeStyle([$options.splitorStyle]),
          class: "uni-countdown__splitor"
        },
        vue.toDisplayString($options.secondText),
        5
        /* TEXT, STYLE */
      )) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const __easycom_0 = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render], ["__scopeId", "data-v-342c352a"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/node_modules/@dcloudio/uni-ui/lib/uni-countdown/uni-countdown.vue"]]);
  const useCountdownStore = defineStore("countdown", () => {
    const showM = vue.ref(-1);
    const showS = vue.ref(-1);
    const timer = vue.ref(0);
    return {
      showM,
      showS,
      timer
    };
  });
  const _sfc_main$4 = /* @__PURE__ */ vue.defineComponent({
    __name: "pay",
    setup(__props) {
      const countdownStore = useCountdownStore();
      const orderId = vue.ref(0);
      const orderNumber = vue.ref("");
      const orderAmount = vue.ref(0);
      const orderTime = vue.ref();
      vue.ref(null);
      onLoad(async (options) => {
        formatAppLog("log", "at pages/pay/pay.vue:45", "orderTime什么东西？", options);
        orderId.value = options.orderId;
        orderNumber.value = options.orderNumber;
        orderAmount.value = options.orderAmount;
        orderTime.value = options.orderTime.replace(" ", "T");
      });
      const toSuccess = async () => {
        if (countdownStore.showM == -1 && countdownStore.showS == -1) {
          uni.redirectTo({
            url: "/pages/orderDetail/orderDetail?orderId=" + orderId.value
          });
          return;
        }
        formatAppLog("log", "at pages/pay/pay.vue:62", "开始模拟支付...");
        const payDTO = {
          orderNumber: orderNumber.value,
          payMethod: 1
        };
        uni.request({
          url: "http://localhost:8081/user/order/payment/mock",
          // 请确保端口号和你后端一致
          method: "PUT",
          data: payDTO,
          header: {
            authentication: uni.getStorageSync("token")
            // 必须带上Token
          },
          success: (res) => {
            if (res.data.code === 0) {
              formatAppLog("log", "at pages/pay/pay.vue:82", "模拟支付成功");
              if (countdownStore.timer !== void 0) {
                clearInterval(countdownStore.timer);
                countdownStore.timer = void 0;
              }
              uni.redirectTo({
                url: "/pages/submit/success?orderId=" + orderId.value + "&orderNumber=" + orderNumber.value + "&orderAmount=" + orderAmount.value + "&orderTime=" + orderTime.value
              });
            } else {
              uni.showToast({ title: res.data.msg || "支付失败", icon: "none" });
            }
          },
          fail: (err) => {
            formatAppLog("log", "at pages/pay/pay.vue:107", err);
            uni.showToast({ title: "网络请求失败", icon: "none" });
          }
        });
      };
      const timeup = () => {
        formatAppLog("log", "at pages/pay/pay.vue:115", "------------ 执行了一次倒计时timeup ---------------");
        let timeupSecond = vue.ref(20);
        if (countdownStore.timer !== void 0) {
          clearInterval(countdownStore.timer);
        }
        countdownStore.timer = setInterval(() => {
          let buy_time = new Date(orderTime.value).getTime();
          let time = buy_time + 15 * 60 * 1e3 - (/* @__PURE__ */ new Date()).getTime();
          formatAppLog("log", "at pages/pay/pay.vue:132", "time", time);
          if (time > 0 && countdownStore.timer !== void 0) {
            var m = time / 1e3 / 60 % 60;
            var s = time / 1e3 % 60;
            timeupSecond.value = time / 1e3;
            countdownStore.showM = Math.floor(m);
            countdownStore.showS = Math.floor(s);
          } else {
            formatAppLog("log", "at pages/pay/pay.vue:146", "订单已超时！");
            clearInterval(countdownStore.timer);
            countdownStore.showM = -1;
            countdownStore.showS = -1;
            cancelOrder();
          }
        }, 1e3);
      };
      const cancelOrder = async () => {
        await cancelOrderAPI(orderId.value);
      };
      return (_ctx, _cache) => {
        const _component_uni_countdown = resolveEasycom(vue.resolveDynamicComponent("uni-countdown"), __easycom_0);
        return vue.openBlock(), vue.createElementBlock("view", { class: "pay_box" }, [
          vue.unref(countdownStore).showM == 0 && vue.unref(countdownStore).showS == 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "time"
          }, "订单已超时")) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "time"
          }, [
            vue.createTextVNode(" 支付剩余时间 "),
            vue.createVNode(_component_uni_countdown, {
              color: "#888",
              "show-day": false,
              "show-hour": false,
              minute: vue.unref(countdownStore).showM,
              second: vue.unref(countdownStore).showS,
              onTimeup: _cache[0] || (_cache[0] = ($event) => timeup())
            }, null, 8, ["minute", "second"])
          ])),
          vue.createElementVNode(
            "view",
            { class: "price" },
            "￥" + vue.toDisplayString(orderAmount.value),
            1
            /* TEXT */
          ),
          vue.createElementVNode(
            "view",
            { class: "shop" },
            "寒夜餐厅 - " + vue.toDisplayString(orderNumber.value),
            1
            /* TEXT */
          ),
          vue.createElementVNode("view", { class: "wechat" }, [
            vue.createElementVNode("image", {
              class: "pay",
              src: "/static/icon/pay.png"
            }),
            vue.createTextVNode(" 微信支付 "),
            vue.createElementVNode("image", {
              class: "choose",
              src: "/static/icon/choose.png"
            })
          ]),
          vue.createElementVNode("view", { class: "bottom" }, [
            vue.createElementVNode("button", {
              class: "comfirm_btn",
              type: "primary",
              plain: true,
              onClick: _cache[1] || (_cache[1] = ($event) => toSuccess())
            }, "确认支付")
          ])
        ]);
      };
    }
  });
  const PagesPayPay = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["__scopeId", "data-v-8a6251df"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/pay/pay.vue"]]);
  const _sfc_main$3 = /* @__PURE__ */ vue.defineComponent({
    __name: "orderDetail",
    setup(__props) {
      const childComp = vue.ref(null);
      const statusList = [
        {
          status: 0,
          name: "全部订单"
        },
        {
          status: 1,
          name: "等待支付"
        },
        {
          status: 2,
          name: "等待商家接单"
        },
        {
          status: 3,
          name: "商家已接单"
        },
        {
          status: 4,
          name: "正在派送中"
        },
        {
          status: 5,
          name: "订单已完成"
        },
        {
          status: 6,
          name: "订单已取消"
        }
      ];
      const countdownStore = useCountdownStore();
      const order = vue.reactive({
        id: 0,
        // 订单id
        number: "",
        // 订单号
        status: 0,
        // 订单状态 1待付款 2待接单 3已接单 4派送中 5已完成 6已取消
        userId: 0,
        // 下单用户id
        addressBookId: 0,
        // 地址id
        orderTime: /* @__PURE__ */ new Date(),
        // 下单时间
        orderDetailList: []
        // 订单详情
      });
      onLoad(async (options) => {
        formatAppLog("log", "at pages/orderDetail/orderDetail.vue:164", "options", options);
        order.id = Number(options.orderId);
        await getOrderDetail();
      });
      const getOrderDetail = async () => {
        formatAppLog("log", "at pages/orderDetail/orderDetail.vue:170", "获取订单详情");
        const res = await getOrderAPI(order.id);
        formatAppLog("log", "at pages/orderDetail/orderDetail.vue:172", "res", res);
        Object.assign(order, res.data);
        formatAppLog("log", "at pages/orderDetail/orderDetail.vue:174", "刷新得到新的order", order);
      };
      const computedDeliveryFee = vue.computed(() => {
        if (order.deliveryFee !== void 0 && order.deliveryFee !== null) {
          return Number(order.deliveryFee);
        }
        const totalAmount = order.amount || 0;
        const packAmount = order.packAmount || 0;
        const dishTotal = (order.orderDetailList || []).reduce((sum, item) => {
          return sum + (item.amount || 0) * (item.number || 0);
        }, 0);
        const deliveryFee = totalAmount - dishTotal - packAmount;
        return Math.max(0, deliveryFee);
      });
      const cancelOrder = async () => {
        formatAppLog("log", "at pages/orderDetail/orderDetail.vue:202", "取消订单");
        const res = await cancelOrderAPI(order.id);
        if (res.code === 0) {
          uni.showToast({
            title: "订单已取消",
            icon: "none"
          });
        } else {
          uni.showModal({
            title: "提示",
            content: "商家已接单，欲取消订单请与商家联系！",
            showCancel: false,
            // 不显示取消按钮
            success: function(res2) {
              if (res2.confirm) {
                formatAppLog("log", "at pages/orderDetail/orderDetail.vue:216", "用户点击确定");
              }
            }
          });
        }
        await getOrderDetail();
      };
      const pushOrder = async () => {
        formatAppLog("log", "at pages/orderDetail/orderDetail.vue:227", "催单");
        const res = await urgeOrderAPI(order.id);
        formatAppLog("log", "at pages/orderDetail/orderDetail.vue:229", "催单res信息", res.data);
        if (childComp.value) {
          childComp.value.openPopup();
        }
      };
      const reOrder = async () => {
        formatAppLog("log", "at pages/orderDetail/orderDetail.vue:242", "再来一单");
        await cleanCartAPI();
        await reOrderAPI(order.id);
        uni.switchTab({
          url: "/pages/order/order"
        });
      };
      const connectShop = () => {
        formatAppLog("log", "at pages/orderDetail/orderDetail.vue:254", "联系商家");
        uni.makePhoneCall({
          phoneNumber: "1999"
        });
      };
      const toPay = async () => {
        formatAppLog("log", "at pages/orderDetail/orderDetail.vue:262", "支付成功");
        const payDTO = {
          orderNumber: order.number,
          payMethod: 1
          // 本平台默认微信支付
        };
        await payOrderAPI(payDTO);
        if (countdownStore.timer !== void 0) {
          clearInterval(countdownStore.timer);
          countdownStore.timer = void 0;
        }
        uni.redirectTo({
          url: "/pages/pay/pay?orderId=" + order.id + "&orderNumber=" + order.number + "&orderAmount=" + order.amount + "&orderTime=" + order.orderTime
        });
      };
      return (_ctx, _cache) => {
        const _component_uni_countdown = resolveEasycom(vue.resolveDynamicComponent("uni-countdown"), __easycom_0);
        return vue.openBlock(), vue.createElementBlock(
          vue.Fragment,
          null,
          [
            vue.createElementVNode("view", { class: "white_box" }, [
              vue.createElementVNode(
                "view",
                { class: "orderDetail" },
                vue.toDisplayString(statusList[order.status].name),
                1
                /* TEXT */
              ),
              order.status === 1 ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "time_box"
              }, [
                vue.unref(countdownStore).showM <= 0 && vue.unref(countdownStore).showS <= 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "time"
                }, "订单已超时")) : (vue.openBlock(), vue.createElementBlock("view", {
                  key: 1,
                  class: "time"
                }, [
                  vue.createTextVNode(" 支付剩余时间 "),
                  vue.createVNode(_component_uni_countdown, {
                    color: "#888",
                    "show-day": false,
                    "show-hour": false,
                    minute: vue.unref(countdownStore).showM,
                    second: vue.unref(countdownStore).showS
                  }, null, 8, ["minute", "second"])
                ]))
              ])) : vue.createCommentVNode("v-if", true),
              vue.createElementVNode("view", { class: "btn_box" }, [
                vue.createCommentVNode(" 1待付款 2待接单 3已接单 4派送中 5已完成 6已取消 "),
                order.status <= 2 ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "reOrder",
                  onClick: cancelOrder
                }, "取消订单")) : vue.createCommentVNode("v-if", true),
                order.status === 1 && (vue.unref(countdownStore).showM > 0 || vue.unref(countdownStore).showS > 0) ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 1,
                  class: "toPay",
                  onClick: toPay
                }, "立即支付 ")) : vue.createCommentVNode("v-if", true),
                order.status === 2 ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 2,
                  class: "pushOrder",
                  onClick: pushOrder
                }, "催单")) : vue.createCommentVNode("v-if", true),
                order.status === 2 || order.status === 6 ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 3,
                  class: "reOrder",
                  onClick: reOrder
                }, "再来一单")) : vue.createCommentVNode("v-if", true)
              ])
            ]),
            vue.createCommentVNode(" 1、订单菜品列表 "),
            vue.createElementVNode("view", { class: "white_box" }, [
              vue.createElementVNode("view", { class: "word_text" }, [
                vue.createElementVNode("text", { class: "word_style" }, "寒页餐厅")
              ]),
              vue.createElementVNode("view", { class: "order-type" }, [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList(order.orderDetailList, (obj, index) => {
                    return vue.openBlock(), vue.createElementBlock("view", {
                      class: "type_item",
                      key: index
                    }, [
                      vue.createElementVNode("view", { class: "dish_img" }, [
                        vue.createElementVNode("image", {
                          mode: "aspectFill",
                          src: obj.pic,
                          class: "dish_img_url"
                        }, null, 8, ["src"])
                      ]),
                      vue.createElementVNode("view", { class: "dish_info" }, [
                        vue.createElementVNode(
                          "view",
                          { class: "dish_name" },
                          vue.toDisplayString(obj.name),
                          1
                          /* TEXT */
                        ),
                        obj.dishFlavor ? (vue.openBlock(), vue.createElementBlock(
                          "view",
                          {
                            key: 0,
                            class: "dish_flavor"
                          },
                          vue.toDisplayString(obj.dishFlavor),
                          1
                          /* TEXT */
                        )) : vue.createCommentVNode("v-if", true),
                        vue.createElementVNode("view", { class: "dish_amount" }, [
                          obj.number && obj.number > 0 ? (vue.openBlock(), vue.createElementBlock(
                            "text",
                            {
                              key: 0,
                              class: "dish_number"
                            },
                            "x " + vue.toDisplayString(obj.number),
                            1
                            /* TEXT */
                          )) : vue.createCommentVNode("v-if", true)
                        ]),
                        vue.createElementVNode("view", { class: "dish_price" }, [
                          vue.createElementVNode("text", { class: "ico" }, "￥"),
                          vue.createTextVNode(
                            " " + vue.toDisplayString(obj.amount),
                            1
                            /* TEXT */
                          )
                        ])
                      ])
                    ]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                )),
                vue.createElementVNode("view", { class: "word_text" }, [
                  vue.createElementVNode("view", { class: "word_left" }, "打包费"),
                  vue.createElementVNode(
                    "view",
                    { class: "word_right" },
                    "￥" + vue.toDisplayString(order.packAmount),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "word_text" }, [
                  vue.createElementVNode("view", { class: "word_left" }, "配送费"),
                  vue.createElementVNode(
                    "view",
                    { class: "word_right" },
                    "￥" + vue.toDisplayString(computedDeliveryFee.value.toFixed(2)),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "all_price" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "word_right" },
                    "总价 ￥" + vue.toDisplayString(order.amount),
                    1
                    /* TEXT */
                  )
                ])
              ])
            ]),
            vue.createElementVNode("view", { class: "white_box" }, [
              vue.createElementVNode("view", {
                class: "text_center",
                onClick: connectShop
              }, "联系商家")
            ]),
            vue.createCommentVNode(" 2、备注+餐具份数+发票 "),
            vue.createElementVNode("view", { class: "white_box" }, [
              vue.createElementVNode("view", { class: "bottom_text" }, [
                vue.createElementVNode("view", { class: "text_left" }, "备注"),
                vue.createElementVNode(
                  "view",
                  { class: "text_right" },
                  vue.toDisplayString(order.remark),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "bottom_text" }, [
                vue.createElementVNode("view", { class: "text_left" }, "餐具份数"),
                vue.createElementVNode(
                  "view",
                  { class: "text_right" },
                  vue.toDisplayString(order.tablewareNumber == -1 ? "无需餐具" : order.tablewareNumber == 0 ? "商家根据餐量提供" : order.tablewareNumber),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "bottom_text" }, [
                vue.createElementVNode("view", { class: "text_left" }, "发票"),
                vue.createElementVNode("view", { class: "text_right" }, "本店不支持线上发票，请致电商家提供")
              ])
            ]),
            vue.createElementVNode("view", { class: "white_box" }, [
              vue.createElementVNode("view", { class: "bottom_text" }, [
                vue.createElementVNode("view", { class: "text_left" }, "订单号"),
                vue.createElementVNode(
                  "view",
                  { class: "text_right" },
                  vue.toDisplayString(order.number),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "bottom_text" }, [
                vue.createElementVNode("view", { class: "text_left" }, "下单时间"),
                vue.createElementVNode(
                  "view",
                  { class: "text_right" },
                  vue.toDisplayString(order.orderTime),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "bottom_text" }, [
                vue.createElementVNode("view", { class: "text_left" }, "预计送达"),
                vue.createElementVNode(
                  "view",
                  { class: "text_right" },
                  vue.toDisplayString(order.estimatedDeliveryTime),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "bottom_text" }, [
                vue.createElementVNode("view", { class: "text_left" }, "地址"),
                vue.createElementVNode(
                  "view",
                  { class: "text_right" },
                  vue.toDisplayString(order.address),
                  1
                  /* TEXT */
                )
              ])
            ]),
            vue.createCommentVNode(" 催单massageBox "),
            vue.createVNode(
              pushMsg,
              {
                ref_key: "childComp",
                ref: childComp
              },
              null,
              512
              /* NEED_PATCH */
            )
          ],
          64
          /* STABLE_FRAGMENT */
        );
      };
    }
  });
  const PagesOrderDetailOrderDetail = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-2d945b00"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/orderDetail/orderDetail.vue"]]);
  const _sfc_main$2 = /* @__PURE__ */ vue.defineComponent({
    __name: "history",
    setup(__props) {
      const childComp = vue.ref(null);
      const statusOptions = [
        {
          status: 0,
          name: "全部订单"
        },
        {
          status: 1,
          name: "待付款"
        },
        {
          status: 5,
          name: "已完成"
        },
        {
          status: 6,
          name: "已取消"
        }
      ];
      const statusList = [
        {
          status: 0,
          name: "全部订单"
        },
        {
          status: 1,
          name: "待付款"
        },
        {
          status: 2,
          name: "待接单"
        },
        {
          status: 3,
          name: "已接单"
        },
        {
          status: 4,
          name: "派送中"
        },
        {
          status: 5,
          name: "已完成"
        },
        {
          status: 6,
          name: "已取消"
        }
      ];
      vue.ref(1);
      vue.ref(10);
      const activeIndex = vue.ref(0);
      const historyOrders = vue.ref([]);
      const orderDTO = vue.ref({
        page: 1,
        pageSize: 6
        // status: 0,
      });
      const total = vue.ref(0);
      onLoad(async () => {
        formatAppLog("log", "at pages/history/history.vue:121", "首先分页获取所有订单信息", orderDTO.value);
        await getOrderPage(0);
      });
      onShow(async () => {
        orderDTO.value.page = 1;
        historyOrders.value = [];
        await getOrderPage(activeIndex.value, "更改状态");
      });
      onReachBottom(() => {
        formatAppLog("log", "at pages/history/history.vue:133", "Page:", orderDTO.value.page);
        formatAppLog("log", "at pages/history/history.vue:134", "Page Size:", orderDTO.value.pageSize);
        if (orderDTO.value.page * orderDTO.value.pageSize >= total.value) {
          formatAppLog("log", "at pages/history/history.vue:136", "end!");
          uni.showToast({
            title: "end!",
            icon: "none"
          });
          return;
        }
        orderDTO.value.page += 1;
        getOrderPage(activeIndex.value);
      });
      const getOrderPage = async (index, type) => {
        activeIndex.value = index;
        formatAppLog("log", "at pages/history/history.vue:150", "根据status获取订单信息");
        if (index !== 0) {
          orderDTO.value.status = statusOptions[index].status;
        } else {
          delete orderDTO.value.status;
        }
        formatAppLog("log", "at pages/history/history.vue:157", "orderDTO", orderDTO.value);
        const res = await getOrderPageAPI(orderDTO.value);
        if (type === "更改状态") {
          historyOrders.value = res.data.records;
          orderDTO.value.page = 1;
        } else {
          historyOrders.value = historyOrders.value.concat(res.data.records);
        }
        total.value = res.data.total;
      };
      const toOrderDetail = (id) => {
        uni.navigateTo({
          url: "/pages/orderDetail/orderDetail?orderId=" + id
        });
      };
      const getTotalCopies = (order) => {
        return (order.orderDetailList || []).reduce((sum, it) => sum + (it.number || 0), 0);
      };
      const reOrder = async (id) => {
        formatAppLog("log", "at pages/history/history.vue:180", "再来一单", id);
        await cleanCartAPI();
        await reOrderAPI(id);
        uni.switchTab({
          url: "/pages/order/order"
        });
      };
      const pushOrder = (id) => {
        formatAppLog("log", "at pages/history/history.vue:192", "催单", id);
        childComp.value.openPopup();
      };
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock(
          vue.Fragment,
          null,
          [
            vue.createElementVNode("view", { class: "history_top" }, [
              (vue.openBlock(), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList(statusOptions, (item, index) => {
                  return vue.createElementVNode("view", {
                    key: index,
                    class: vue.normalizeClass(["history_title", { active: index === activeIndex.value }]),
                    onClick: ($event) => getOrderPage(index, "更改状态")
                  }, [
                    vue.createElementVNode(
                      "text",
                      { class: "name" },
                      vue.toDisplayString(item.name),
                      1
                      /* TEXT */
                    )
                  ], 10, ["onClick"]);
                }),
                64
                /* STABLE_FRAGMENT */
              ))
            ]),
            vue.createElementVNode("view", { class: "blank" }),
            vue.createElementVNode("view", { class: "history_content" }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList(historyOrders.value, (item, index) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    class: "history_item",
                    key: index,
                    onClick: ($event) => toOrderDetail(item.id)
                  }, [
                    vue.createElementVNode("view", { class: "item_info_box" }, [
                      vue.createElementVNode("view", { class: "history_item_left" }, [
                        vue.createElementVNode(
                          "view",
                          { class: "history_item_order_id" },
                          "订单号：" + vue.toDisplayString(item.number),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode("scroll-view", {
                          class: "scroll_container",
                          "scroll-x": ""
                        }, [
                          (vue.openBlock(true), vue.createElementBlock(
                            vue.Fragment,
                            null,
                            vue.renderList(item.orderDetailList, (dish, index2) => {
                              return vue.openBlock(), vue.createElementBlock("view", {
                                key: index2,
                                class: "image_box"
                              }, [
                                vue.createElementVNode("image", {
                                  src: dish.pic
                                }, null, 8, ["src"])
                              ]);
                            }),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ]),
                        vue.createElementVNode(
                          "view",
                          { class: "history_item_order_time" },
                          vue.toDisplayString(item.orderTime),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "history_item_right" }, [
                        vue.createElementVNode(
                          "view",
                          { class: "history_item_status" },
                          vue.toDisplayString(statusList[item.status].name),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode(
                          "view",
                          { class: "history_item_price" },
                          "￥" + vue.toDisplayString(item.amount),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode(
                          "view",
                          { class: "history_item_dish_amount" },
                          "共" + vue.toDisplayString(getTotalCopies(item)) + "份",
                          1
                          /* TEXT */
                        )
                      ])
                    ]),
                    vue.createElementVNode("view", { class: "btn_box" }, [
                      vue.createElementVNode("view", {
                        class: "history_item_reOrder",
                        onClick: vue.withModifiers(($event) => reOrder(item.id), ["stop"])
                      }, "再来一单", 8, ["onClick"]),
                      item.status === 2 ? (vue.openBlock(), vue.createElementBlock("view", {
                        key: 0,
                        class: "history_item_push_order",
                        onClick: vue.withModifiers(($event) => pushOrder(item.id), ["stop"])
                      }, " 催单 ", 8, ["onClick"])) : vue.createCommentVNode("v-if", true)
                    ])
                  ], 8, ["onClick"]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            vue.createCommentVNode(" 催单massageBox "),
            vue.createVNode(
              pushMsg,
              {
                ref_key: "childComp",
                ref: childComp
              },
              null,
              512
              /* NEED_PATCH */
            )
          ],
          64
          /* STABLE_FRAGMENT */
        );
      };
    }
  });
  const PagesHistoryHistory = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-73685b36"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/history/history.vue"]]);
  const _sfc_main$1 = /* @__PURE__ */ vue.defineComponent({
    __name: "updateMy",
    setup(__props) {
      const userStore = useUserStore();
      const user = vue.reactive({
        id: userStore.profile.id,
        name: "",
        gender: 1,
        phone: "未设置",
        pic: ""
      });
      const items = [
        {
          value: 1,
          name: "男士"
        },
        {
          value: 0,
          name: "女士"
        }
      ];
      onLoad(async () => {
        formatAppLog("log", "at pages/updateMy/updateMy.vue:57", "userStore", userStore.profile);
        await getUserInfo(user.id);
      });
      const getUserInfo = async (id) => {
        const res = await getUserInfoAPI(id);
        formatAppLog("log", "at pages/updateMy/updateMy.vue:63", "用户信息", res);
        user.name = res.data.name;
        user.gender = res.data.gender ?? 1;
        user.phone = res.data.phone;
        user.pic = res.data.pic;
        formatAppLog("log", "at pages/updateMy/updateMy.vue:68", "user", user);
      };
      const picChange = () => {
        formatAppLog("log", "at pages/updateMy/updateMy.vue:72", "picChange");
        uni.chooseMedia({
          count: 1,
          mediaType: ["image"],
          sourceType: ["album", "camera"],
          maxDuration: 15,
          camera: "back",
          // 获取图片成功的回调
          success: (res) => {
            formatAppLog("log", "at pages/updateMy/updateMy.vue:81", res);
            const { tempFilePath } = res.tempFiles[0];
            let base64String = "";
            wx.getFileSystemManager().readFile({
              filePath: tempFilePath,
              encoding: "base64",
              // 图片转base64成功的回调
              success: (res2) => {
                base64String = "data:image/png;base64," + res2.data;
                formatAppLog("log", "at pages/updateMy/updateMy.vue:91", base64String);
                user.pic = base64String;
              }
            });
          }
        });
      };
      const genderChange = (val) => {
        user.gender = val;
        formatAppLog("log", "at pages/updateMy/updateMy.vue:100", user.gender);
      };
      const validateForm = () => {
        let valid = true;
        if (!user.name) {
          uni.showToast({
            title: "昵称不能为空",
            icon: "none"
          });
          valid = false;
        }
        const phonePattern = /^1[3-9]\d{9}$/;
        if (!user.phone) {
          uni.showToast({
            title: "手机号不能为空",
            icon: "none"
          });
          valid = false;
        } else if (!phonePattern.test(user.phone)) {
          uni.showToast({
            title: "手机号格式不正确",
            icon: "none"
          });
          valid = false;
        }
        return valid;
      };
      const submit = async () => {
        formatAppLog("log", "at pages/updateMy/updateMy.vue:132", "submit", user);
        if (!validateForm()) {
          return;
        }
        const res = await updateUserAPI(user);
        if (res.code === 0) {
          uni.showToast({
            title: "修改成功",
            icon: "success"
          });
          uni.switchTab({
            url: "/pages/my/my"
          });
        }
      };
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock(
          vue.Fragment,
          null,
          [
            vue.createCommentVNode(" 信息input框列表 "),
            vue.createElementVNode("view", { class: "submit" }, [
              vue.createElementVNode(
                "form",
                { onSubmit: submit },
                [
                  vue.createElementVNode("view", {
                    class: "pic_box",
                    onClick: picChange
                  }, [
                    !user.pic ? (vue.openBlock(), vue.createElementBlock("image", {
                      key: 0,
                      src: "/static/images/user_default.png",
                      mode: "aspectFill"
                    })) : (vue.openBlock(), vue.createElementBlock("image", {
                      key: 1,
                      src: user.pic,
                      mode: "aspectFill"
                    }, null, 8, ["src"])),
                    vue.createElementVNode("view", { class: "text" }, "点击上传头像")
                  ]),
                  vue.createElementVNode("view", { class: "radio" }, [
                    (vue.openBlock(), vue.createElementBlock(
                      vue.Fragment,
                      null,
                      vue.renderList(items, (item, index) => {
                        return vue.createElementVNode("view", {
                          class: "radio-item",
                          key: index,
                          onClick: ($event) => genderChange(item.value)
                        }, [
                          item.value != user.gender ? (vue.openBlock(), vue.createElementBlock("image", {
                            key: 0,
                            class: "radio-img",
                            src: "/static/icon/icon-radio.png"
                          })) : (vue.openBlock(), vue.createElementBlock("image", {
                            key: 1,
                            class: "radio-img",
                            src: "/static/icon/icon-radio-selected.png"
                          })),
                          vue.createElementVNode(
                            "text",
                            { class: "radio-label" },
                            vue.toDisplayString(item.name),
                            1
                            /* TEXT */
                          )
                        ], 8, ["onClick"]);
                      }),
                      64
                      /* STABLE_FRAGMENT */
                    ))
                  ]),
                  vue.createElementVNode("view", { class: "item" }, [
                    vue.createElementVNode("view", { class: "title" }, "昵称"),
                    vue.withDirectives(vue.createElementVNode(
                      "input",
                      {
                        class: "item_input",
                        placeholder: "请输入昵称",
                        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => user.name = $event)
                      },
                      null,
                      512
                      /* NEED_PATCH */
                    ), [
                      [vue.vModelText, user.name]
                    ])
                  ]),
                  vue.createElementVNode("view", { class: "item" }, [
                    vue.createElementVNode("view", { class: "title" }, "手机号"),
                    vue.withDirectives(vue.createElementVNode(
                      "input",
                      {
                        class: "item_input",
                        placeholder: "请输入手机号",
                        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => user.phone = $event)
                      },
                      null,
                      512
                      /* NEED_PATCH */
                    ), [
                      [vue.vModelText, user.phone]
                    ])
                  ]),
                  vue.createElementVNode("button", {
                    "form-type": "submit",
                    class: "submit_btn"
                  }, "确认修改")
                ],
                32
                /* NEED_HYDRATION */
              )
            ])
          ],
          2112
          /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
        );
      };
    }
  });
  const PagesUpdateMyUpdateMy = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-cb595a61"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/updateMy/updateMy.vue"]]);
  __definePage("pages/order/order", PagesOrderOrder);
  __definePage("pages/my/my", PagesMyMy);
  __definePage("pages/index/index", PagesIndexIndex);
  __definePage("pages/login/login", PagesLoginLogin);
  __definePage("pages/detail/detail", PagesDetailDetail);
  __definePage("pages/submit/submit", PagesSubmitSubmit);
  __definePage("pages/submit/success", PagesSubmitSuccess);
  __definePage("pages/address/address", PagesAddressAddress);
  __definePage("pages/addOrEditAddress/addOrEditAddress", PagesAddOrEditAddressAddOrEditAddress);
  __definePage("pages/remark/remark", PagesRemarkRemark);
  __definePage("pages/pay/pay", PagesPayPay);
  __definePage("pages/orderDetail/orderDetail", PagesOrderDetailOrderDetail);
  __definePage("pages/history/history", PagesHistoryHistory);
  __definePage("pages/updateMy/updateMy", PagesUpdateMyUpdateMy);
  const _sfc_main = /* @__PURE__ */ vue.defineComponent({
    __name: "App",
    setup(__props) {
      onLaunch(() => {
        formatAppLog("log", "at App.vue:4", "App Launch");
      });
      onShow(() => {
        formatAppLog("log", "at App.vue:7", "App Show");
      });
      onHide(() => {
        formatAppLog("log", "at App.vue:10", "App Hide");
      });
      return () => {
      };
    }
  });
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/App.vue"]]);
  function isObject(v) {
    return typeof v === "object" && v !== null;
  }
  function normalizeOptions(options, factoryOptions) {
    options = isObject(options) ? options : /* @__PURE__ */ Object.create(null);
    return new Proxy(options, {
      get(target, key, receiver) {
        if (key === "key")
          return Reflect.get(target, key, receiver);
        return Reflect.get(target, key, receiver) || Reflect.get(factoryOptions, key, receiver);
      }
    });
  }
  function get(state, path) {
    return path.reduce((obj, p) => {
      return obj == null ? void 0 : obj[p];
    }, state);
  }
  function set(state, path, val) {
    return path.slice(0, -1).reduce((obj, p) => {
      if (/^(__proto__)$/.test(p))
        return {};
      else
        return obj[p] = obj[p] || {};
    }, state)[path[path.length - 1]] = val, state;
  }
  function pick(baseState, paths) {
    return paths.reduce((substate, path) => {
      const pathArray = path.split(".");
      return set(substate, pathArray, get(baseState, pathArray));
    }, {});
  }
  function parsePersistence(factoryOptions, store) {
    return (o) => {
      var _a;
      try {
        const {
          storage = localStorage,
          beforeRestore = void 0,
          afterRestore = void 0,
          serializer = {
            serialize: JSON.stringify,
            deserialize: JSON.parse
          },
          key = store.$id,
          paths = null,
          debug = false
        } = o;
        return {
          storage,
          beforeRestore,
          afterRestore,
          serializer,
          key: ((_a = factoryOptions.key) != null ? _a : (k) => k)(typeof key == "string" ? key : key(store.$id)),
          paths,
          debug
        };
      } catch (e) {
        if (o.debug)
          console.error("[pinia-plugin-persistedstate]", e);
        return null;
      }
    };
  }
  function hydrateStore(store, { storage, serializer, key, debug }) {
    try {
      const fromStorage = storage == null ? void 0 : storage.getItem(key);
      if (fromStorage)
        store.$patch(serializer == null ? void 0 : serializer.deserialize(fromStorage));
    } catch (e) {
      if (debug)
        console.error("[pinia-plugin-persistedstate]", e);
    }
  }
  function persistState(state, { storage, serializer, key, paths, debug }) {
    try {
      const toStore = Array.isArray(paths) ? pick(state, paths) : state;
      storage.setItem(key, serializer.serialize(toStore));
    } catch (e) {
      if (debug)
        console.error("[pinia-plugin-persistedstate]", e);
    }
  }
  function createPersistedState(factoryOptions = {}) {
    return (context) => {
      const { auto = false } = factoryOptions;
      const {
        options: { persist = auto },
        store,
        pinia: pinia2
      } = context;
      if (!persist)
        return;
      if (!(store.$id in pinia2.state.value)) {
        const original_store = pinia2._s.get(store.$id.replace("__hot:", ""));
        if (original_store)
          Promise.resolve().then(() => original_store.$persist());
        return;
      }
      const persistences = (Array.isArray(persist) ? persist.map((p) => normalizeOptions(p, factoryOptions)) : [normalizeOptions(persist, factoryOptions)]).map(parsePersistence(factoryOptions, store)).filter(Boolean);
      store.$persist = () => {
        persistences.forEach((persistence) => {
          persistState(store.$state, persistence);
        });
      };
      store.$hydrate = ({ runHooks = true } = {}) => {
        persistences.forEach((persistence) => {
          const { beforeRestore, afterRestore } = persistence;
          if (runHooks)
            beforeRestore == null ? void 0 : beforeRestore(context);
          hydrateStore(store, persistence);
          if (runHooks)
            afterRestore == null ? void 0 : afterRestore(context);
        });
      };
      persistences.forEach((persistence) => {
        const { beforeRestore, afterRestore } = persistence;
        beforeRestore == null ? void 0 : beforeRestore(context);
        hydrateStore(store, persistence);
        afterRestore == null ? void 0 : afterRestore(context);
        store.$subscribe(
          (_mutation, state) => {
            persistState(state, persistence);
          },
          {
            detached: true
          }
        );
      });
    };
  }
  var src_default = createPersistedState();
  const pinia = createPinia();
  pinia.use(src_default);
  function createApp() {
    const app = vue.createVueApp(App);
    app.use(pinia);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
