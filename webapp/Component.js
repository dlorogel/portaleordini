sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "it/orogel/portaleordini/model/models",
    "sap/ui/core/routing/HashChanger"
],
    function (UIComponent, Device, models, HashChanger) {
        "use strict";

        const oAppComponent = UIComponent.extend("it.orogel.portaleordini.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                HashChanger.getInstance().replaceHash("");
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");
            }, setNavigation: function (oNavigation) {
                this.oNavigation = oNavigation;
            },
        });
        oAppComponent.prototype.i18n = function () {
            return this.getModel("i18n").getResourceBundle();
        };
        oAppComponent.prototype.setOrdine = function (Header) {
            this.Ordine = Header;
        };
        oAppComponent.prototype.getOrdine = function () {
            return this.Ordine;
        };
        oAppComponent.prototype.setAgente = function (Agente) {
            this.Agente = Agente;
        };
        oAppComponent.prototype.getAgente = function () {
            return this.Agente;
        };
        oAppComponent.prototype.getNumeroAgente = function () {
            return this.NumeroAgente;
        };
        oAppComponent.prototype.setNumeroAgente = function (NumeroAgente) {
            this.NumeroAgente = NumeroAgente;
        };
        oAppComponent.prototype.setRicerca = function (Ricerca) {
            this.Ricerca = Ricerca;
        };
        oAppComponent.prototype.getRicerca = function () {
            return this.Ricerca;
        };
        oAppComponent.prototype._oBusyControl = {};

        /**
         * Handler for busy indicators
         * ---------------------------
         */
        oAppComponent.prototype.busy = function (bState, oControl) {
            if (oControl) {
                if (!this._oBusyControl[oControl.sId]) {
                    this._oBusyControl[oControl.sId] = oControl;
                }
                oControl.setBusy(bState);
            } else {
                (bState) ? sap.ui.core.BusyIndicator.show() : sap.ui.core.BusyIndicator.hide();
            }
        };

        /**
         * Reset all active busy indicators
         * --------------------------------
         */
        oAppComponent.prototype.resetAllBusy = function () {
            Object.keys(this._oBusyControl).forEach((sId) => {
                const oControl = sap.ui.getCore().byId(sId);
                if (oControl && oControl.isBusy()) {
                    oControl.setBusy(false);
                }
            });

            sap.ui.core.BusyIndicator.hide();
        };
        return oAppComponent;
    }
);