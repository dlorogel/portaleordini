sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Filter",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Fragment, FilterOperator, Filter, MessageBox, MessageToast, History) {
        "use strict";

        const oAppController = Controller.extend("it.orogel.portaleordini.controller.View1", {
            onInit: function () {
                var User = sap.ushell.Container.getService("UserInfo").getId();
                let aUserFilter = [];
                aUserFilter.push(new Filter("USER", FilterOperator.EQ, User));
                var oRouter = this.getOwnerComponent().getRouter();
                sap.ui.core.UIComponent.getRouterFor(this).attachRoutePatternMatched(this._onObjectMatched, this);
                this.oComponent = this.getOwnerComponent();
                this.oComponent.busy(true);
                const oPromiseCustomer = new Promise((resolve, reject) => {
                    this.getView().getModel().read("/UserCustomer", {
                        filters: [aUserFilter],
                        success: (aData) => {
                            resolve(aData.results);
                        },
                        error: (oError) => {
                            reject;
                        }
                    });
                });
                oPromiseCustomer.then((aResults) => {
                    const oAppModel = this.getView().getModel("appModel");
                    aResults.sort(function (a, b) {
                        return a.Name1.localeCompare(b.Name1);
                    });
                    oAppModel.setProperty("/Customer", aResults);
                    if (aResults.length === 0) {
                        MessageToast.show(this.oComponent.i18n().getText("msg.error.noCustomer.text"));
                    } else {
                        this.getOwnerComponent().setAgente(aResults[0].AGENTE);
                        this.getOwnerComponent().setNumeroAgente(aResults[0].AgentNumber);
                        if (aResults.length === 1) {
                            oAppModel.setProperty("/CustomerKey", aResults[0].Kunnr);
                        }
                    }
                }, oError => {
                    MessageToast.show(this.oComponent.i18n().getText("msg.error.zUserCustomer.text"));
                    this.oComponent.resetAllBusy();
                });
            },
            _onObjectMatched: function (oEvent) {
                if (this.getOwnerComponent().getRicerca() === "X" && this.getView().byId("boxCustomer").getSelectedKey() !== "") {
                    this.onRicercaOrdini();
                    this.getOwnerComponent().setRicerca("");
                }
            },
            onRicercaOrdini: function () {
                this.Customer = this.getView().byId("boxCustomer").getSelectedKey();
                const oFinalFilter = new Filter({
                    filters: [],
                    and: true
                });
                if (this.Customer === "") {
                    MessageToast.show(this.oComponent.i18n().getText("msg.error.SelectCustomer.text"));
                } else {
                    this.Customer = String(this.Customer).padStart(10, "0");
                    let aKunnrFilter = [];
                    aKunnrFilter.push(new Filter("Kunnr", FilterOperator.EQ, this.Customer));
                    oFinalFilter.aFilters.push(new Filter({
                        filters: aKunnrFilter,
                        and: false
                    }));
                    this.StatoOrdineFilter = this.getView().byId("StatoOrdineInput").getSelectedKey();
                    if (this.StatoOrdineFilter !== "") {
                        let aStatoOrdineFilter = [];
                        aStatoOrdineFilter.push(new Filter("StatoOrdine", FilterOperator.EQ, this.StatoOrdineFilter));
                        oFinalFilter.aFilters.push(new Filter({
                            filters: aStatoOrdineFilter,
                            and: false
                        }));
                    }
                    this.NumeroOrdineFilter = this.getView().byId("NumeroOrdineInput").getValue();
                    if (this.NumeroOrdineFilter !== "" && this.NumeroOrdineFilter !== undefined) {
                        this.NumeroOrdineFilter = String(this.NumeroOrdineFilter).padStart(10, "0");
                        let aNumeroOrdineFilter = [];
                        aNumeroOrdineFilter.push(new Filter("Vbeln", FilterOperator.EQ, this.NumeroOrdineFilter));
                        oFinalFilter.aFilters.push(new Filter({
                            filters: aNumeroOrdineFilter,
                            and: false
                        }));
                    }
                    this.AreaVenditeFilter = this.getView().byId("AreaVenditeInput").getSelectedKey();
                    if (this.AreaVenditeFilter !== "") {
                        let aAreaVenditeFilter = [];
                        aAreaVenditeFilter.push(new Filter("AreaVendite", FilterOperator.EQ, this.AreaVenditeFilter));
                        oFinalFilter.aFilters.push(new Filter({
                            filters: aAreaVenditeFilter,
                            and: false
                        }));
                    }
                    this.StatoElaborazioneFilter = this.getView().byId("StatoElaborazioneInput").getSelectedKey();
                    if (this.StatoElaborazioneFilter !== "") {
                        let aStatoElaborazioneFilter = [];
                        aStatoElaborazioneFilter.push(new Filter("StatoElaborazione", FilterOperator.EQ, this.StatoElaborazioneFilter));
                        oFinalFilter.aFilters.push(new Filter({
                            filters: aStatoElaborazioneFilter,
                            and: false
                        }));
                    }
                    if (this.DataDaInput !== undefined && this.DataDaInput !== "" && !(isNaN(this.DataDaInput))) {
                        let aDataDaInputFilter = [];
                        aDataDaInputFilter.push(new Filter("Edatu", FilterOperator.GE, this.DataDaInput));
                        oFinalFilter.aFilters.push(new Filter({
                            filters: aDataDaInputFilter,
                            and: false
                        }));
                    };
                    if (this.DataAInput !== undefined && this.DataAInput !== "" && !(isNaN(this.DataAInput))) {
                        let aDataAInputFilter = [];
                        aDataAInputFilter.push(new Filter("Edatu", FilterOperator.LE, this.DataAInput));
                        oFinalFilter.aFilters.push(new Filter({
                            filters: aDataAInputFilter,
                            and: false
                        }));
                    };
                    let aAUARTFilter = [];
                    aAUARTFilter.push(new Filter("AUART", FilterOperator.EQ, "ZPOR"));
                    aAUARTFilter.push(new Filter("AUART", FilterOperator.EQ, "ZCD4"));
                    oFinalFilter.aFilters.push(new Filter({
                        filters: aAUARTFilter,
                        and: false
                    }));
                    const oPromiseOrdini = new Promise((resolve, reject) => {
                        this.getView().getModel().read("/OrderFilterSet", {
                            filters: [oFinalFilter],
                            success: (aData) => {
                                resolve(aData.results);
                            },
                            error: (oError) => {
                                reject;
                            }
                        });
                    });
                    oPromiseOrdini.then((aResults) => {
                        if (aResults.length === 0) {
                            MessageToast.show(this.oComponent.i18n().getText("msg.error.noOrdini.text"));
                        } else {
                            const oPromiseNote = new Promise((resolve, reject) => {
                                let aNumeroOrdineFilter = [];
                                aResults.forEach(x => {
                                    aNumeroOrdineFilter.push(new Filter("SalesOrder", FilterOperator.EQ, x.Vbeln));
                                    if (x.StatoOrdine === "Consegnato" || x.StatoElaborazione === "Completato") {
                                        x.Modifica = false;
                                    } else {
                                        x.Modifica = true;
                                    }
                                });
                                let oModelNote = this.getView().getModel("NoteModel");
                                oModelNote.read("/A_SalesOrderText", {
                                    filters: [aNumeroOrdineFilter],
                                    success: (oData) => {
                                        oData.results.forEach(y => {
                                            var find = aResults.find(x => x.Vbeln === y.SalesOrder);
                                            if (find !== undefined) {
                                                find.Note = y.LongText;
                                            }
                                        })
                                        resolve();
                                    },
                                    error: (oError) => {
                                        reject;
                                    }
                                });
                            });
                            oPromiseNote.then(() => {
                                this._setTableModel(aResults);
                            }, oError => {
                                MessageToast.show(this.oComponent.i18n().getText("msg.error.note.text"));
                                this.oComponent.resetAllBusy();
                            });
                        }
                    }, oError => {
                        MessageToast.show(this.oComponent.i18n().getText("msg.error.ordini.text"));
                        this.oComponent.resetAllBusy();
                    });
                }

            },
            DataDaChange: function (oEvent) {
                this.DataDaInput = this.getView().byId("DataDaInput").getValue();
                this.DataDaInput = new Date(this.DataDaInput);
                let timezone = this.DataDaInput.getTimezoneOffset() / 60;
                this.DataDaInput.setHours(this.DataDaInput.getHours() - timezone);
            },
            DataAChange: function (oEvent) {
                this.DataAInput = this.getView().byId("DataAInput").getValue();
                this.DataAInput = new Date(this.DataAInput);
                let timezone = this.DataAInput.getTimezoneOffset() / 60;
                this.DataAInput.setHours(this.DataAInput.getHours() - timezone);
            },
            onVisualizzaOrdine: function (oEvent) {
                var index = oEvent.getSource().getParent().getIndex();
                var header = this.getView().byId("OrdiniTable").getContextByIndex(index).getObject();
                this.Agente = this.getOwnerComponent().getAgente();
                header.Agente = this.Agente;
                this.getOwnerComponent().setOrdine(header);
                this.getOwnerComponent().getRouter().navTo("RouteView2");
            },
            onNavToModifica: function (oEvent) {
                var index = oEvent.getSource().getParent().getIndex();
                var header = this.getView().byId("OrdiniTable").getContextByIndex(index).getObject();
                this.getOwnerComponent().setOrdine(header);
                this.getOwnerComponent().getRouter().navTo("RouteView3");
            },
            onCreaOrdine: function (oEvent) {
                this.Customer = this.getView().byId("boxCustomer").getSelectedKey();
                this.Agente = this.getOwnerComponent().getAgente();
                if (this.Customer === "") {
                    MessageToast.show(this.oComponent.i18n().getText("msg.error.SelectCustomer.text"));
                } else {
                    var header = {
                        "Kunnr": this.Customer,
                        "Agente": this.Agente
                    }
                    this.getOwnerComponent().setOrdine(header);
                    this.getOwnerComponent().getRouter().navTo("RouteView4");
                }
            }
        });
        /**
* Set table model 
* ---------------
* @param aProducts - products
* @private
*/
        oAppController.prototype._setTableModel = function (aResults) {
            //set model: concat new batch of data to previous model
            const oAppModel = this.getView().getModel("appModel");
            const oTable = this.getView().byId("OrdiniTable");
            oAppModel.setProperty("/testataordini", aResults);
            oTable.setModel(oAppModel);
            oTable.bindRows("/testataordini");
            //oTable.getColumns().map((col, index) => {
            //    if (index !== 1) oTable.autoResizeColumn(index)
            //});
            oTable.sort(oTable.getColumns()[0]);
            oAppModel.refresh(true);
            this.oComponent.resetAllBusy();
        };
        return oAppController;
    });
