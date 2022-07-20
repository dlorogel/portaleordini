sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Filter",
    "sap/m/Dialog",
    "sap/m/DialogType",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Fragment, FilterOperator, Filter, Dialog, DialogType, MessageBox, MessageToast, History, Constants) {
        "use strict";


        const oAppController = Controller.extend("it.orogel.portaleordini.controller.ModificaOrdine", {
            onInit: function () {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("RouteView3").attachPatternMatched(this._onObjectMatched, this);
                this.oComponent = this.getOwnerComponent();
            },
            _onObjectMatched: function (oEvent) {
                this.oComponent.busy(true);
                this.Testata = this.getOwnerComponent().getOrdine();
                this.CBOEliminati = [];
                this.NumeroOrdineFilter = String(this.Testata.Vbeln).padStart(10, "0");
                let aNumeroOrdineFilter = [];
                aNumeroOrdineFilter.push(new Filter("VBELN", FilterOperator.EQ, this.NumeroOrdineFilter));
                this.KunnrFilter = String(this.Testata.Kunnr).padStart(10, "0");
                let aKunnrFilter = [];
                aKunnrFilter.push(new Filter("KUNNR", FilterOperator.EQ, this.KunnrFilter));
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
                const oPromiseDestinatario = new Promise((resolve, reject) => {
                    this.getView().getModel().read("/DestinatarioMerciSet", {
                        filters: [aKunnrFilter],
                        success: (aData) => {
                            resolve(aData.results);
                        },
                        error: (oError) => {
                            reject;
                        }
                    });
                });
                const oFinalFilter = new Filter({
                    filters: [],
                    and: true
                });
                oFinalFilter.aFilters.push(new Filter({
                    filters: aNumeroOrdineFilter,
                    and: false
                }));
                oFinalFilter.aFilters.push(new Filter({
                    filters: aKunnrFilter,
                    and: false
                }));
                const oPromiseArticoli = new Promise((resolve, reject) => {
                    this.getView().getModel().read("/ModificaArticoliSet", {
                        filters: [oFinalFilter],
                        success: (aData) => {
                            resolve(aData.results);
                        },
                        error: (oError) => {
                            reject;
                        }
                    });
                });
                const oPromiseCatalogo = new Promise((resolve, reject) => {
                    this.getView().getModel().read("/ModificaCatalogoSet", {
                        filters: [oFinalFilter],
                        success: (aData) => {
                            resolve(aData.results);
                        },
                        error: (oError) => {
                            reject;
                        }
                    });
                });
                Promise.all([oPromiseOrdini, oPromiseDestinatario, oPromiseArticoli, oPromiseCatalogo]).then((aResults) => {
                    this.getView().byId("NumeroOrdine").setValue(this.Testata.Vbeln);
                    this.getView().byId("AreaVendite").setValue(this.Testata.AreaVendite);
                    this.getView().byId("StatoElaborazione").setValue(this.Testata.StatoElaborazione);
                    this.getView().byId("Note").setValue(this.Testata.Note);
                    if (aResults.length > 0) {
                        this.getView().byId("DestinazioneMerci").setValue(aResults[0][0].DESTINATARIO);
                        this.keydestinatario = aResults[1].find(x => x.INDIRIZZO === this.getView().byId("DestinazioneMerci").getValue()).CODICEDESTINATARIO;
                        this.getView().byId("DataConsegna").setValue(aResults[0][0].VDATU.toLocaleDateString('it'));
                        aResults.forEach(y => {
                            if (y.UDM === "CT") {
                                y.UDM = "Cartoni";
                            } else if (y.UDM === "STR") {
                                y.UDM = "Strati";
                            } else if (y.UDM === "PAL") {
                                y.UDM = "Pallet";
                            }
                        });
                        const oAppModel = this.getView().getModel("appModel");
                        oAppModel.setProperty("/DestinazioneMerci", aResults[1]);
                        this.ArticoliOrdine = aResults[0];
                        this.Articoli = aResults[2];
                        this.Catalogo = aResults[3];
                        this.CBO = [];
                        this.ArticoliAggiunti = [];
                        this.ArticoliOrdine.forEach(x => {
                            this.CBO.push(JSON.parse(JSON.stringify(x)));
                        });
                        this._setTableModel(aResults[0]);
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
            onAggiungiArticolo: function () {
                this.oSelectionScreenDialog = null;
                this._createSelectionScreenDialog();
            },
            onChangeDestinatarioMerci: function () {
                const oAppModel = this.getView().getModel("appModel");
                this.keydestinatariochange = this.getView().byId("DestinazioneMerci").getSelectedKey();
            },
            /**
            * On after close context dialog button handler
            *--------------------------------------------
            * @param oEvent - event
            */
            onAfterCloseSelectionScreenDialog: function (oEvent) {
                this.oSelectionScreenDialog.destroy();
                this.oSelectionScreenDialog = null;
            },
            onAggiungiCatalogo: function (oEvent) {
                this.Catalogo.forEach(x => {
                    this.ArticoliAggiunti.push(JSON.parse(JSON.stringify(x)));
                });
                this._setTableModel(this.ArticoliOrdine.concat(this.ArticoliAggiunti));
                this.oSelectionScreenDialog.close();
                this.onAfterCloseSelectionScreenDialog;
            },
            onSalvaArticoli: function (oEvent) {
                this.Articoli.forEach(x => {
                    if (x.Changed === true) {
                        this.ArticoliAggiunti.push(JSON.parse(JSON.stringify(x)));
                        x.Changed = false;
                    }
                });
                this._setTableModel(this.ArticoliOrdine.concat(this.ArticoliAggiunti));
                this.oSelectionScreenDialog.close();
                this.onAfterCloseSelectionScreenDialog;
            },
            onDataChange: function (oEvent) {
                const oAppModel = this.getView().getModel("appModel");
                var dateParts = this.getView().byId("DataConsegna").getValue().replaceAll(".", "/");
                this.getView().byId("DataConsegna").setValue(dateParts);
            },
            onElimina: function (oEvent) {
                for (var i = 0; i < this.ArticoliOrdine.length; i++) {
                    if (this.ArticoliOrdine[i] === oEvent.getSource().getParent().getRowBindingContext().getObject()) {
                        this.CBOEliminati.push(JSON.parse(JSON.stringify(this.ArticoliOrdine[i])));
                        this.ArticoliOrdine.splice(i, 1);
                    }
                }
                for (var i = 0; i < this.ArticoliAggiunti.length; i++) {
                    if (this.ArticoliAggiunti[i] === oEvent.getSource().getParent().getRowBindingContext().getObject()) {
                        this.ArticoliAggiunti.splice(i, 1);
                    }
                }
                this._setTableModel(this.ArticoliOrdine.concat(this.ArticoliAggiunti));
            },
            onSalvaModificaOrdine: function (oEvent) {
                this.oComponent.busy(true);
                for (var i = 0; i < this.ArticoliOrdine.concat(this.ArticoliAggiunti).length; i++) {
                    if (this.ArticoliOrdine.concat(this.ArticoliAggiunti)[i].UDM === "Cartoni") {
                        this.ArticoliOrdine.concat(this.ArticoliAggiunti)[i].UDM = "CT";
                    } else if (this.ArticoliOrdine.concat(this.ArticoliAggiunti)[i].UDM === "Strati") {
                        this.ArticoliOrdine.concat(this.ArticoliAggiunti)[i].UDM = "STR";
                    } else if (this.ArticoliOrdine.concat(this.ArticoliAggiunti)[i].UDM === "Pallet") {
                        this.ArticoliOrdine.concat(this.ArticoliAggiunti)[i].UDM = "PAL";
                    }
                }
                if (this.CBO.length > 0) {
                    this.VBELN = this.CBO[0].VBELN;
                    this.AUART = this.CBO[0].AUART;
                    var Order = {
                        "SalesOrder": this.VBELN
                    };
                    if (this.StatoElaborazione !== this.getView().byId("StatoElaborazione").getValue() && this.getView().byId("StatoElaborazione").getValue() !== "") {
                        var DeliveryBlockReason = this.getView().byId("StatoElaborazione").getValue();
                        if (DeliveryBlockReason === "Draft") {
                            DeliveryBlockReason = "Z1";
                        } else if (DeliveryBlockReason === "Completato") {
                            DeliveryBlockReason = "Z2";
                        }
                        this.DeliveryBlockReason = DeliveryBlockReason;
                        Order.DeliveryBlockReason = DeliveryBlockReason;
                    }
                    if (this.getView().byId("Note").getValue() !== this.Testata.Note) {
                        var Note = this.getView().byId("Note").getValue();
                    }
                    var dateParts = this.getView().byId("DataConsegna").getValue().split("/");
                    var datecontrol = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
                    let timezone = datecontrol.getTimezoneOffset() / 60;
                    datecontrol.setHours(datecontrol.getHours() - timezone);
                    if (datecontrol.toISOString() !== this.CBO[0].VDATU) {
                        var date = datecontrol.getTime();
                        date = "/Date(" + date + ")/";
                        Order.RequestedDeliveryDate = date;
                        //cambiare data nel sales order, negli item
                    }
                    if (this.keydestinatariochange !== undefined) {
                        var changedestinatario = this.keydestinatariochange;
                    }
                    const oPromiseOrdine = new Promise((resolve, reject) => {
                        $.ajax({
                            cache: false,
                            crossDomain: true,
                            type: "GET",
                            contentType: "application/json; charset=ytf-8",
                            //dataType: "json",
                            url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder('" + this.VBELN.padStart(10, "0") + "')?$expand=to_Text&$format=json",
                            headers: {
                                "Accept": "*/*",
                                "x-csrf-token": "fetch",
                                "Content-Type": "application/json",
                                "DataServiceVersion": "2.0",
                                "MaxDataServiceVersion": "2.0",
                                "X-Requested-With": "XMLHttpRequest",
                                "sap-contextid-accept": "header"
                            },
                            success: (oData, sTextStatus, oRequest) => {
                                if (oData.d.to_Text.results.find(x => x.LongTextID === "ZO01") !== undefined) {
                                    this.ZO01 = oData.d.to_Text.results.find(x => x.LongTextID === "ZO01").LongText;
                                } else {
                                    this.ZO01 = undefined;
                                }
                                if (Order.RequestedDeliveryDate !== undefined || Order.DeliveryBlockReason !== undefined) {
                                    this._PatchSalesOrder(
                                        oRequest,
                                        oData,
                                        Order,
                                        resolve,
                                        reject)
                                } else {
                                    resolve(this.oComponent.i18n().getText("msg.success.salvaOrdine.text"));
                                }
                            },
                            error: (oError) => {
                                reject(this.oComponent.i18n().getText("msg.error.salvaOrdine.text"));
                            }
                        });
                    });
                    const oPromiseDM = new Promise((resolve, reject) => {
                        $.ajax({
                            cache: false,
                            crossDomain: true,
                            type: "GET",
                            contentType: "application/json; charset=ytf-8",
                            //dataType: "json",
                            url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrderHeaderPartner(SalesOrder='" + this.VBELN.padStart(10, "0") + "',PartnerFunction='DM')?$format=json",
                            headers: {
                                "Accept": "*/*",
                                "x-csrf-token": "fetch",
                                "Content-Type": "application/json",
                                "DataServiceVersion": "2.0",
                                "MaxDataServiceVersion": "2.0",
                                "X-Requested-With": "XMLHttpRequest",
                                "sap-contextid-accept": "header"
                            },
                            success: (oData, sTextStatus, oRequest) => {
                                if (changedestinatario !== undefined) {
                                    this._PatchDM(
                                        oRequest,
                                        oData,
                                        changedestinatario,
                                        resolve,
                                        reject)
                                } else {
                                    resolve(this.oComponent.i18n().getText("msg.success.salvaCustomer.text"));
                                }
                            },
                            error: (oError) => {
                                reject(this.oComponent.i18n().getText("msg.error.salvaCustomer.text"));
                            }
                        });
                    });
                    const oPromiseBV = new Promise((resolve, reject) => {
                        if (this.AUART === "ZCD4") {
                            $.ajax({
                                cache: false,
                                crossDomain: true,
                                type: "GET",
                                contentType: "application/json; charset=ytf-8",
                                //dataType: "json",
                                url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrderHeaderPartner(SalesOrder='" + this.VBELN.padStart(10, "0") + "',PartnerFunction='BV')?$format=json",
                                headers: {
                                    "Accept": "*/*",
                                    "x-csrf-token": "fetch",
                                    "Content-Type": "application/json",
                                    "DataServiceVersion": "2.0",
                                    "MaxDataServiceVersion": "2.0",
                                    "X-Requested-With": "XMLHttpRequest",
                                    "sap-contextid-accept": "header"
                                },
                                success: (oData, sTextStatus, oRequest) => {
                                    //aggiungere condizione oDatalenght
                                    if (changedestinatario !== undefined) {
                                        this._PatchBV(
                                            oRequest,
                                            oData,
                                            changedestinatario,
                                            resolve,
                                            reject)
                                    } else {
                                        resolve(this.oComponent.i18n().getText("msg.success.salvaCustomer.text"));
                                    }
                                },
                                error: (oError) => {
                                    reject(this.oComponent.i18n().getText("msg.error.salvaCustomer.text"));
                                }
                            });
                        } else {
                            resolve(this.oComponent.i18n().getText("msg.success.salvaCustomer.text"));
                        }
                    });
                    Promise.all([oPromiseOrdine, oPromiseDM, oPromiseBV]).then(() => {
                        let oPromiseEliminaItem = Promise.resolve();
                        this.CBOEliminati.forEach(x => {
                            oPromiseEliminaItem = oPromiseEliminaItem.then(() => {
                                return this.EliminaItem(x);
                            });
                        });
                        Promise.all([oPromiseEliminaItem]).then(() => {
                            let oPromisePatchItem = Promise.resolve();
                            var patchItem = [];
                            this.ArticoliOrdine.forEach(x => {
                                var find = this.CBO.find(y => y.POS === x.POS);
                                if (find !== undefined) {
                                    if (JSON.stringify(x) !== JSON.stringify(find)) {
                                        patchItem.push(x);
                                    }
                                }
                            });
                            patchItem.forEach(x => {
                                oPromisePatchItem = oPromisePatchItem.then(() => {
                                    return this.ModificaItem(x);
                                });
                            });
                            Promise.all([oPromiseEliminaItem]).then(() => {
                                let oPromiseLineItem = Promise.resolve();
                                if (Order.RequestedDeliveryDate !== undefined) {
                                    this.ArticoliOrdine.forEach(x => {
                                        oPromiseLineItem = oPromiseLineItem.then(() => {
                                            return this.LineItem(x, Order);
                                        });
                                    });
                                }
                                Promise.all([oPromiseLineItem]).then(() => {
                                    const oPromiseText = new Promise((resolve, reject) => {
                                        //if (this.ZO01 !== undefined || this.ZO01 !== "") {
                                        if (this.ZO01 !== undefined) {
                                            $.ajax({
                                                cache: false,
                                                crossDomain: true,
                                                type: "GET",
                                                contentType: "application/json; charset=ytf-8",
                                                //dataType: "json",
                                                url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrderText(SalesOrder='" + this.VBELN.padStart(10, "0") + "',Language='IT',LongTextID='ZO01')?$format=json",
                                                headers: {
                                                    "Accept": "*/*",
                                                    "x-csrf-token": "fetch",
                                                    "Content-Type": "application/json",
                                                    "DataServiceVersion": "2.0",
                                                    "MaxDataServiceVersion": "2.0",
                                                    "X-Requested-With": "XMLHttpRequest",
                                                    "sap-contextid-accept": "header"
                                                },
                                                success: (oData, sTextStatus, oRequest) => {
                                                    //aggiungere condizione oDatalenght
                                                    if (oData.d !== undefined) {
                                                        this._PatchText(
                                                            oRequest,
                                                            oData,
                                                            Note,
                                                            resolve,
                                                            reject)
                                                    } else {
                                                        resolve(this.oComponent.i18n().getText("msg.success.PatchText.text"));
                                                    }
                                                },
                                                error: (oError) => {
                                                    reject(this.oComponent.i18n().getText("msg.error.PatchText.text"));
                                                }
                                            });
                                        } else {
                                            resolve(this.oComponent.i18n().getText("msg.success.PatchText.text"));
                                        }
                                    });
                                    oPromiseText.then(() => {
                                        const oPromisePOSTTextOrdine = new Promise((resolve, reject) => {
                                            // if (((this.ZO01 === undefined || this.ZO01 === "") && Note !== "" && Note !== undefined)) {
                                            if (((this.ZO01 === undefined) && Note !== "" && Note !== undefined)) {
                                                $.ajax({
                                                    cache: false,
                                                    crossDomain: true,
                                                    type: "GET",
                                                    contentType: "application/json; charset=ytf-8",
                                                    //                                                    url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder('" + this.VBELN.padStart(10, "0") + "')/to_Text?$format=json",
                                                    url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrderText?$format=json",
                                                    headers: {
                                                        "Accept": "*/*",
                                                        "x-csrf-token": "fetch",
                                                        "Content-Type": "application/json",
                                                        "DataServiceVersion": "2.0",
                                                        "MaxDataServiceVersion": "2.0",
                                                        "X-Requested-With": "XMLHttpRequest",
                                                        "sap-contextid-accept": "header"
                                                    },
                                                    success: (oData, sTextStatus, oRequest) => {
                                                        this._PostSalesOrder(
                                                            oRequest,
                                                            oData,
                                                            Note,
                                                            resolve,
                                                            reject);
                                                    },
                                                    error: (oError) => {
                                                        reject(this.oComponent.i18n().getText("msg.error.salvaOrdine.text"));
                                                    }
                                                });
                                            } else {
                                                resolve(this.oComponent.i18n().getText("msg.success.salvaCustomer.text"));
                                            }
                                        });
                                        oPromisePOSTTextOrdine.then(() => {
                                            let oPromisePOSTItem = Promise.resolve();
                                            if (this.ArticoliAggiunti.length > 0) {
                                                this.ArticoliAggiunti.forEach(x => {
                                                    oPromisePOSTItem = oPromisePOSTItem.then(() => {
                                                        return this.PostItem(x);
                                                    });
                                                });
                                            }
                                            Promise.all([oPromisePOSTItem]).then(() => {
                                                const oPromiseSendEmail = new Promise((resolve, reject) => {
                                                    if (this.DeliveryBlockReason === "Z2") {
                                                        if (this.ZO01 === undefined) {
                                                            this.Note = "";
                                                        } else {
                                                            this.Note = this.ZO01;
                                                        }
                                                        var Email = {
                                                            "VBELN": this.VBELN,
                                                            "Note": this.Note
                                                        };
                                                        this.getView().getModel().create("/SendEmailSet", Email, {
                                                            success: () => {
                                                                resolve();
                                                            },
                                                            error: (oError) => {
                                                                reject(this.getComponent().i18n().getText("msg.error.sendemail.text", Constants.API.REGISTRI_WINE_DATE.SERVICE));
                                                            }
                                                        }, [], true);
                                                    } else {
                                                        resolve();
                                                    }
                                                });
                                                oPromiseSendEmail.then(() => {
                                                    MessageToast.show(this.oComponent.i18n().getText("msg.success.salvaOrdine.text"));
                                                    this.oComponent.setRicerca("X");
                                                    this.oComponent.resetAllBusy();
                                                    this.onNavBack();
                                                },
                                                    oError => {
                                                        this.oComponent.resetAllBusy();
                                                        MessageToast.show(this.oComponent.i18n().getText("msg.error.sendemail.text"));
                                                    });
                                            }, oError => {
                                                MessageToast.show(this.oComponent.i18n().getText("msg.error.PostItem.text"));
                                                this.oComponent.resetAllBusy();
                                            });
                                        }, oError => {
                                            MessageToast.show(this.oComponent.i18n().getText("msg.error.PostText.text"));
                                            this.oComponent.resetAllBusy();
                                        });
                                    }, oError => {
                                        MessageToast.show(this.oComponent.i18n().getText("msg.error.PatchText.text"));
                                        this.oComponent.resetAllBusy();
                                    });
                                },
                                    oError => {
                                        MessageToast.show(this.oComponent.i18n().getText("msg.error.scheduleLine.text"));
                                        this.oComponent.resetAllBusy();
                                    });
                            },
                                oError => {
                                    MessageToast.show(this.oComponent.i18n().getText("msg.error.modificaItem.text"));
                                    this.oComponent.resetAllBusy();
                                });
                        },
                            oError => {
                                MessageToast.show(this.oComponent.i18n().getText("msg.error.eliminaItem.text"));
                                this.oComponent.resetAllBusy();
                            });
                    }, oError => {
                        MessageToast.show(this.oComponent.i18n().getText("msg.error.salvaOrdine.text"));
                        this.oComponent.resetAllBusy();
                    });
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
            const oTable = this.getView().byId("TableItems");
            oAppModel.setProperty("/Items", aResults);
            oTable.setModel(oAppModel);
            oTable.bindRows("/Items");
            oTable.sort(oTable.getColumns()[0]);
            oAppModel.refresh(true);
            this.oComponent.resetAllBusy();
        };
        oAppController.prototype._setArticoliModel = function () {
            //set model: concat new batch of data to previous model
            const oAppModel = this.getView().getModel("appModel");
            const oTable = sap.ui.getCore().byId("TableArticoli");
            oAppModel.setProperty("/Articoli", this.Articoli);
            oTable.setModel(oAppModel);
            oTable.bindRows("/Articoli");
            oTable.sort(oTable.getColumns()[0]);
            oAppModel.refresh(true);
            this.oComponent.resetAllBusy();
        };
        oAppController.prototype._setCatalogoModel = function () {
            //set model: concat new batch of data to previous model
            const oAppModel = this.getView().getModel("appModel");
            const oTable = sap.ui.getCore().byId("TableCatalogo");
            oAppModel.setProperty("/Catalogo", this.Catalogo);
            oTable.setModel(oAppModel);
            oTable.bindRows("/Catalogo");
            oTable.sort(oTable.getColumns()[0]);
            oAppModel.refresh(true);
            this.oComponent.resetAllBusy();
        };
        /**
        * Create selection screen dialog
        * ------------------------------
        */
        oAppController.prototype._createSelectionScreenDialog = function () {
            var ns = this.oComponent.getMetadata().getRootView().viewName.split(".");
            var namespace = ns[0] + "." + ns[1] + "." + ns[2];
            if (this.oSelectionScreenDialog === null) {
                //get dialog from fragment, add dialog to view and forward compact style to dialog
                this.oSelectionScreenDialog = sap.ui.xmlfragment(namespace + ".view.SelectionScreen", this);
                this.getView().addDependent(this.oSelectionScreenDialog);
                this._setArticoliModel();
                this._setCatalogoModel();
            }
            this.oSelectionScreenDialog.open();
        };
        oAppController.prototype._PatchSalesOrder = function (oRequest, oData, Order, resolve, reject) {
            const sToken = this._getToken(oRequest);
            const sEtag = oData.d.__metadata.etag;
            delete Order.SalesOrder;
            if (sToken) {
                $.ajax({
                    cache: false,
                    crossDomain: true,
                    // dataType: "json",
                    async: true,
                    type: "PATCH",
                    url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder('" + this.VBELN.padStart(10, "0") + "')",
                    headers: {
                        "Accept": "*/*",
                        "Content-Type": "application/json",
                        "x-csrf-token": sToken,
                        "If-Match": sEtag
                    },
                    data: JSON.stringify(Order),
                    success: (oData, sTextStatus, oRequest) => {
                        resolve(this.oComponent.i18n().getText("msg.success.salvaOrdine.text"));
                    },
                    error: (oError) => {
                        reject(this.oComponent.i18n().getText("msg.error.salvaOrdine.text"));
                    }
                });
            } else {
                reject(this.oComponent.i18n().getText("msg.error.salvaOrdine.text"));
            }
        };
        oAppController.prototype._PatchDM = function (oRequest, oData, changedestinatario, resolve, reject) {
            const sToken = this._getToken(oRequest);
            const sEtag = oData.d.__metadata.etag;
            var Customer = {
                Customer: changedestinatario
            };
            if (sToken) {
                $.ajax({
                    cache: false,
                    crossDomain: true,
                    // dataType: "json",
                    async: true,
                    type: "PATCH",
                    url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrderHeaderPartner(SalesOrder='" + this.VBELN.padStart(10, "0") + "',PartnerFunction='DM')",
                    headers: {
                        "Accept": "*/*",
                        "Content-Type": "application/json",
                        "x-csrf-token": sToken,
                        "If-Match": sEtag
                    },
                    data: JSON.stringify(Customer),
                    success: (oData, sTextStatus, oRequest) => {
                        resolve(this.oComponent.i18n().getText("msg.success.salvaCustomer.text"));
                    },
                    error: (oError) => {
                        reject(this.oComponent.i18n().getText("msg.error.salvaCustomer.text"));
                    }
                });
            } else {
                reject(this.oComponent.i18n().getText("msg.error.salvaCustomer.text"));
            }
        };
        oAppController.prototype._PatchBV = function (oRequest, oData, changedestinatario, resolve, reject) {
            const sToken = this._getToken(oRequest);
            const sEtag = oData.d.__metadata.etag;
            var Customer = {
                Customer: changedestinatario
            };
            if (sToken) {
                $.ajax({
                    cache: false,
                    crossDomain: true,
                    // dataType: "json",
                    async: true,
                    type: "PATCH",
                    url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrderHeaderPartner(SalesOrder='" + this.VBELN.padStart(10, "0") + "',PartnerFunction='BV')",
                    headers: {
                        "Accept": "*/*",
                        "Content-Type": "application/json",
                        "x-csrf-token": sToken,
                        "If-Match": sEtag
                    },
                    data: JSON.stringify(Customer),
                    success: (oData, sTextStatus, oRequest) => {
                        resolve(this.oComponent.i18n().getText("msg.success.salvaCustomer.text"));
                    },
                    error: (oError) => {
                        reject(this.oComponent.i18n().getText("msg.error.salvaCustomer.text"));
                    }
                });
            } else {
                reject(this.oComponent.i18n().getText("msg.error.salvaCustomer.text"));
            }
        };
        oAppController.prototype.EliminaItem = function (Item) {
            return new Promise((resolve, reject) => {
                let oPromiseItem = Promise.resolve();
                oPromiseItem = oPromiseItem.then(() => {
                    $.ajax({
                        cache: false,
                        crossDomain: true,
                        type: "GET",
                        contentType: "application/json; charset=ytf-8",
                        //dataType: "json",
                        url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrderItem(SalesOrder='" + this.VBELN.padStart(10, "0") + "',SalesOrderItem='" + Item.POS + "')?$format=json",
                        headers: {
                            "Accept": "*/*",
                            "x-csrf-token": "fetch",
                            "Content-Type": "application/json",
                            "DataServiceVersion": "2.0",
                            "MaxDataServiceVersion": "2.0",
                            "X-Requested-With": "XMLHttpRequest",
                            "sap-contextid-accept": "header"
                        },
                        success: (oData, sTextStatus, oRequest) => {
                            this.DeleteItem(
                                oRequest,
                                oData,
                                Item,
                                resolve,
                                reject)
                        },
                        error: (oError) => {
                            reject(this.oComponent.i18n().getText("msg.error.eliminaItem.text"));
                        }
                    });
                });
            });
        };
        oAppController.prototype.DeleteItem = function (oRequest, oData, Item, resolve, reject) {
            const sToken = this._getToken(oRequest);
            const sEtag = oData.d.__metadata.etag;
            if (sToken) {
                $.ajax({
                    cache: false,
                    crossDomain: true,
                    // dataType: "json",
                    async: true,
                    type: "DELETE",
                    url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrderItem(SalesOrder='" + this.VBELN.padStart(10, "0") + "',SalesOrderItem='" + Item.POS + "')",
                    headers: {
                        "Accept": "*/*",
                        "Content-Type": "application/json",
                        "x-csrf-token": sToken,
                        "If-Match": sEtag
                    },
                    success: (oData, sTextStatus, oRequest) => {
                        resolve(this.oComponent.i18n().getText("msg.success.eliminaItem.text"));
                    },
                    error: (oError) => {
                        reject(this.oComponent.i18n().getText("msg.error.eliminaItem.text"));
                    }
                });
            } else {
                reject(this.oComponent.i18n().getText("msg.error.eliminaItem.text"));
            }
        };
        oAppController.prototype.ModificaItem = function (Item) {
            return new Promise((resolve, reject) => {
                let oPromiseItem = Promise.resolve();
                oPromiseItem = oPromiseItem.then(() => {
                    $.ajax({
                        cache: false,
                        crossDomain: true,
                        type: "GET",
                        contentType: "application/json; charset=ytf-8",
                        //dataType: "json",
                        url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrderItem(SalesOrder='" + this.VBELN.padStart(10, "0") + "',SalesOrderItem='" + Item.POS + "')?$format=json",
                        headers: {
                            "Accept": "*/*",
                            "x-csrf-token": "fetch",
                            "Content-Type": "application/json",
                            "DataServiceVersion": "2.0",
                            "MaxDataServiceVersion": "2.0",
                            "X-Requested-With": "XMLHttpRequest",
                            "sap-contextid-accept": "header"
                        },
                        success: (oData, sTextStatus, oRequest) => {
                            this.PatchItem(
                                oRequest,
                                oData,
                                Item,
                                resolve,
                                reject)
                        },
                        error: (oError) => {
                            reject(this.oComponent.i18n().getText("msg.error.modificaItem.text"));
                        }
                    });
                });
            });
        };
        oAppController.prototype.PatchItem = function (oRequest, oData, Item, resolve, reject) {
            const sToken = this._getToken(oRequest);
            const sEtag = oData.d.__metadata.etag;
            var ItemModifica = {
                "POS": Item.POS
            };
            var find = this.CBO.find(x => Item.POS === x.POS);
            if (find !== undefined) {
                if (parseFloat(find.QUANTITA) !== Item.QUANTITA) {
                    ItemModifica.RequestedQuantity = Item.QUANTITA;
                }
                if (find.UDM !== Item.UDM) {
                    ItemModifica.RequestedQuantityUnit = Item.UDM;
                }
            }
            delete ItemModifica.POS;
            if (sToken) {
                $.ajax({
                    cache: false,
                    crossDomain: true,
                    // dataType: "json",
                    async: true,
                    type: "PATCH",
                    url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrderItem(SalesOrder='" + this.VBELN.padStart(10, "0") + "',SalesOrderItem='" + Item.POS + "')",
                    headers: {
                        "Accept": "*/*",
                        "Content-Type": "application/json",
                        "x-csrf-token": sToken,
                        "If-Match": sEtag
                    },
                    data: JSON.stringify(ItemModifica),
                    success: (oData, sTextStatus, oRequest) => {
                        resolve(this.oComponent.i18n().getText("msg.success.modificaItem.text"));
                    },
                    error: (oError) => {
                        reject(this.oComponent.i18n().getText("msg.error.modificaItem.text"));
                    }
                });
            } else {
                reject(this.oComponent.i18n().getText("msg.error.modificaItem.text"));
            }
        };
        oAppController.prototype.LineItem = function (Item, Order) {
            return new Promise((resolve, reject) => {
                let oPromiseItem = Promise.resolve();
                oPromiseItem = oPromiseItem.then(() => {
                    $.ajax({
                        cache: false,
                        crossDomain: true,
                        type: "GET",
                        contentType: "application/json; charset=ytf-8",
                        //dataType: "json",
                        url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrderScheduleLine(SalesOrder='" + this.VBELN.padStart(10, "0") + "',SalesOrderItem='" + Item.POS + "',ScheduleLine='1')?$format=json",
                        headers: {
                            "Accept": "*/*",
                            "x-csrf-token": "fetch",
                            "Content-Type": "application/json",
                            "DataServiceVersion": "2.0",
                            "MaxDataServiceVersion": "2.0",
                            "X-Requested-With": "XMLHttpRequest",
                            "sap-contextid-accept": "header"
                        },
                        success: (oData, sTextStatus, oRequest) => {
                            this.PatchLineItem(
                                oRequest,
                                oData,
                                Item,
                                Order,
                                resolve,
                                reject)
                        },
                        error: (oError) => {
                            reject(this.oComponent.i18n().getText("msg.error.scheduleLine.text"));
                        }
                    });
                });
            });
        };
        oAppController.prototype.PatchLineItem = function (oRequest, oData, Item, Order, resolve, reject) {
            const sToken = this._getToken(oRequest);
            const sEtag = oData.d.__metadata.etag;
            var LineItemModifica = {
                "RequestedDeliveryDate": Order.RequestedDeliveryDate
            };
            if (sToken) {
                $.ajax({
                    cache: false,
                    crossDomain: true,
                    // dataType: "json",
                    async: true,
                    type: "PATCH",
                    url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrderScheduleLine(SalesOrder='" + this.VBELN.padStart(10, "0") + "',SalesOrderItem='" + Item.POS + "',ScheduleLine='1')",
                    headers: {
                        "Accept": "*/*",
                        "Content-Type": "application/json",
                        "x-csrf-token": sToken,
                        "If-Match": sEtag
                    },
                    data: JSON.stringify(LineItemModifica),
                    success: (oData, sTextStatus, oRequest) => {
                        resolve(this.oComponent.i18n().getText("msg.success.scheduleLine.text"));
                    },
                    error: (oError) => {
                        reject(this.oComponent.i18n().getText("msg.error.scheduleLine.text"));
                    }
                });
            } else {
                reject(this.oComponent.i18n().getText("msg.error.scheduleLine.text"));
            }
        };
        oAppController.prototype._PostSalesOrder = function (oRequest, oData, Note, resolve, reject) {
            const sToken = this._getToken(oRequest);
            var language = navigator.language.substring(0, 2).toUpperCase();
            var Text = {
                "SalesOrder": this.VBELN,
                "Language": language,
                "LongTextID": "ZO01",
                "LongText": Note
            }
            if (sToken) {
                $.ajax({
                    cache: false,
                    crossDomain: true,
                    // dataType: "json",
                    async: true,
                    type: "POST",
                    //                    url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder(SalesOrder='" + this.VBELN.padStart(10, "0") + "')/to_Text",
                    url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrderText",
                    headers: {
                        "Accept": "*/*",
                        "Content-Type": "application/json",
                        "x-csrf-token": sToken
                    },
                    data: JSON.stringify(Text),
                    success: (oData, sTextStatus, oRequest) => {
                        resolve(this.oComponent.i18n().getText("msg.success.PostText.text"));
                    },
                    error: (oError) => {
                        reject(this.oComponent.i18n().getText("msg.error.PostText.text"));
                    }
                });
            } else {
                reject(this.oComponent.i18n().getText("msg.error.PostText.text"));
            }
        };
        oAppController.prototype._PatchText = function (oRequest, oData, Note, resolve, reject) {
            const sToken = this._getToken(oRequest);
            const sEtag = oData.d.__metadata.etag;
            var Text = {
                "LongText": Note
            };
            if (sToken) {
                $.ajax({
                    cache: false,
                    crossDomain: true,
                    // dataType: "json",
                    async: true,
                    type: "PATCH",
                    url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrderText(SalesOrder='" + this.VBELN.padStart(10, "0") + "',Language='IT',LongTextID='ZO01')",
                    headers: {
                        "Accept": "*/*",
                        "Content-Type": "application/json",
                        "x-csrf-token": sToken,
                        "If-Match": sEtag
                    },
                    data: JSON.stringify(Text),
                    success: (oData, sTextStatus, oRequest) => {
                        resolve(this.oComponent.i18n().getText("msg.success.PatchText.text"));
                    },
                    error: (oError) => {
                        reject(this.oComponent.i18n().getText("msg.error.PatchText.text"));
                    }
                });
            } else {
                reject(this.oComponent.i18n().getText("msg.error.PatchText.text"));
            }
        };
        oAppController.prototype.PostItem = function (Item) {
            return new Promise((resolve, reject) => {
                let oPromiseItem = Promise.resolve();
                oPromiseItem = oPromiseItem.then(() => {
                    $.ajax({
                        cache: false,
                        crossDomain: true,
                        type: "GET",
                        contentType: "application/json; charset=ytf-8",
                        //dataType: "json",
                        url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder(SalesOrder='" + this.VBELN.padStart(10, "0") + "')/to_Item",
                        headers: {
                            "Accept": "*/*",
                            "x-csrf-token": "fetch",
                            "Content-Type": "application/json",
                            "DataServiceVersion": "2.0",
                            "MaxDataServiceVersion": "2.0",
                            "X-Requested-With": "XMLHttpRequest",
                            "sap-contextid-accept": "header"
                        },
                        success: (oData, sTextStatus, oRequest) => {
                            this.PostItemSuccess(
                                oRequest,
                                oData,
                                Item,
                                resolve,
                                reject)
                        },
                        error: (oError) => {
                            reject(this.oComponent.i18n().getText("msg.error.PostItem.text"));
                        }
                    });
                });
            });
        };
        oAppController.prototype.PostItemSuccess = function (oRequest, oData, Item, resolve, reject) {
            const sToken = this._getToken(oRequest);
            var dateParts = this.getView().byId("DataConsegna").getValue().split("/");
            var date = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
            date.setHours(date.getHours() - date.getTimezoneOffset() / 60);
            date = date.getTime();
            date = "/Date(" + date + ")/";
            var resultsScheduleLine = {
                "results": []
            };
            var ItemPost = {
                "SalesOrder": this.VBELN.padStart(10, "0"),
                "Material": Item.CODARTICOLO,
                "RequestedQuantity": Item.QUANTITA,
                "RequestedQuantityUnit": Item.UDM,
                "to_ScheduleLine": resultsScheduleLine
            };
            var ScheduleLine = {
                "RequestedDeliveryDate": date
            };
            ItemPost.to_ScheduleLine.results.push(ScheduleLine);
            if (sToken) {
                $.ajax({
                    cache: false,
                    crossDomain: true,
                    // dataType: "json",
                    async: true,
                    type: "POST",
                    url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder(SalesOrder='" + this.VBELN.padStart(10, "0") + "')/to_Item",
                    headers: {
                        "Accept": "*/*",
                        "Content-Type": "application/json",
                        "x-csrf-token": sToken
                    },
                    data: JSON.stringify(ItemPost),
                    success: (oData, sTextStatus, oRequest) => {
                        resolve(this.oComponent.i18n().getText("msg.success.PostItem.text"));
                    },
                    error: (oError) => {
                        reject(this.oComponent.i18n().getText("msg.error.PostItem.text"));
                    }
                });
            } else {
                reject(this.oComponent.i18n().getText("msg.error.PostItem.text"));
            }
        };
        oAppController.prototype._getToken = function (oRequest) {
            let aArr = oRequest.getAllResponseHeaders().split(/\r?\n/);
            const headers = aArr.reduce(function (sAcc, sCurr, i) {
                let parts = sCurr.split(': ');
                sAcc[parts[0]] = parts[1];
                return sAcc;
            }, {});
            return headers && headers["x-csrf-token"] ? headers["x-csrf-token"] : "";
        };
        return oAppController;
    }); 