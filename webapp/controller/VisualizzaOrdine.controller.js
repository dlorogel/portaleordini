sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Filter",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Fragment, FilterOperator, Filter, MessageBox, MessageToast, History, Constants) {
        "use strict";


        const oAppController = Controller.extend("it.orogel.portaleordini.controller.VisualizzaOrdine", {
            onInit: function () {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("RouteView2").attachPatternMatched(this._onObjectMatched, this);
                this.oComponent = this.getOwnerComponent();
            },
            _onObjectMatched: function (oEvent) {
                this.oComponent.busy(true);
                this.Testata = this.getOwnerComponent().getOrdine();
                this.NumeroOrdineFilter = String(this.Testata.Vbeln).padStart(10, "0");
                let aNumeroOrdineFilter = [];
                aNumeroOrdineFilter.push(new Filter("VBELN", FilterOperator.EQ, this.NumeroOrdineFilter));
                const oPromiseOrdini = new Promise((resolve, reject) => {
                    this.getView().getModel().read("/ViewOrderSet", {
                        filters: [aNumeroOrdineFilter],
                        success: (aData) => {
                            resolve(aData.results);
                        },
                        error: (oError) => {
                            reject;
                        }
                    });
                });
                oPromiseOrdini.then((aResults) => {
                    this.getView().byId("NumeroOrdine").setValue(this.Testata.Vbeln);
                    this.getView().byId("AreaVendite").setValue(this.Testata.AreaVendite);
                    this.getView().byId("StatoElaborazione").setValue(this.Testata.StatoElaborazione);
                    this.getView().byId("Note").setValue(this.Testata.Note);
                    if (aResults.length > 0) {
                        this.getView().byId("DestinazioneMerci").setValue(aResults[0].DESTINATARIO);
                        this.getView().byId("DataConsegna").setValue(aResults[0].VDATU.toLocaleDateString('it'));
                        aResults.forEach(y => {
                            if (y.UDM === "CT") {
                                y.UDM = "Cartoni";
                            } else if (y.UDM === "STR") {
                                y.UDM = "Strati";
                            } else if (y.UDM === "PAL") {
                                y.UDM = "Pallet";
                            }
                        });
                        this._setTableModel(aResults);
                        this.Articoli = aResults;
                    }
                }, oError => {
                    MessageToast.show(this.oComponent.i18n().getText("msg.error.recuperoordine.text"));
                    this.oComponent.resetAllBusy();
                });
            },
            onNavBack: function () {
                var oHistory = History.getInstance();
                var sPreviousHash = oHistory.getPreviousHash();
                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                } else {
                    var oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("RouteView1", {}, true);
                }
            },
            onCopiaOrdine: function () {
                var copiaHeader = {
                    "Vbeln": this.Testata.Vbeln,
                    "EDATU": this.Testata.Edatu,
                    "Note": this.Testata.Note,
                    "StatoElaborazione": this.Testata.StatoElaborazione,
                    "StatoOrdine": this.Testata.StatoOrdine,
                    "AreaVendite": this.Testata.AreaVendite,
                    "Item": this.Articoli,
                    "Kunnr": this.Testata.Kunnr,
                    "Agente": this.Testata.Agente
                }
                this.getOwnerComponent().setOrdine(copiaHeader);
                this.getOwnerComponent().getRouter().navTo("RouteView4");

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
            const oTable = this.getView().byId("TableItems");
            oAppModel.setProperty("/Items", aResults);
            oTable.setModel(oAppModel);
            oTable.bindRows("/Items");
            oTable.sort(oTable.getColumns()[0]);
            oAppModel.refresh(true);
            this.oComponent.resetAllBusy();
        };
        return oAppController;
    }); 