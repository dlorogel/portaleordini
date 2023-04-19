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


        const oAppController = Controller.extend("it.orogel.portaleordini.controller.CreazioneOrdine", {
            onInit: function () {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("RouteView4").attachPatternMatched(this._onObjectMatched, this);
                this.oComponent = this.getOwnerComponent();
            },
            _onObjectMatched: function (oEvent) {
                this.oComponent.busy(true);
                this.Testata = this.getOwnerComponent().getOrdine();
                this.ArticoliOrdine = [];
                this.KunnrFilter = String(this.Testata.Kunnr).padStart(10, "0");
                let aKunnrFilter = [];
                let aVkorgFilter = [];
                aKunnrFilter.push(new Filter("KUNNR", FilterOperator.EQ, this.KunnrFilter));
                const oPromiseOrdini = new Promise((resolve, reject) => {
                    if (this.Testata.Vbeln !== undefined) {
                        const oOrderFilter = new Filter({
                            filters: [],
                            and: true
                        });
                        aKunnrFilter.push(new Filter("KUNNR", FilterOperator.EQ, this.KunnrFilter));
                        if (this.Testata.AreaVendite === "Surgelato") {
                            this.VKORG = "OPSU";
                        } else {
                            this.VKORG = "OPCF";
                        }
                        aVkorgFilter.push(new Filter("VKORG", FilterOperator.EQ, this.VKORG));
                        oOrderFilter.aFilters.push(new Filter({
                            filters: aKunnrFilter,
                            and: false
                        }));
                        oOrderFilter.aFilters.push(new Filter({
                            filters: aVkorgFilter,
                            and: false
                        }));
                        this.getView().getModel().read("/CreazioneOrdineSet", {
                            filters: [oOrderFilter],
                            success: (aData) => {
                                resolve(aData.results);
                            },
                            error: (oError) => {
                                reject;
                            }
                        });
                    } else {
                        resolve();
                    }
                });
                const oPromiseDestinatario = new Promise((resolve, reject) => {
                    this.getView().getModel().read("/DestinatarioMerciCreazioneSet", {
                        filters: [aKunnrFilter],
                        success: (aData) => {
                            resolve(aData.results);
                        },
                        error: (oError) => {
                            reject;
                        }
                    });
                });
                Promise.all([oPromiseOrdini, oPromiseDestinatario]).then((aResults) => {
                    const oAppModel = this.getView().getModel("appModel");
                    oAppModel.refresh(true);
                    var destinatario = "";
                    this.keydestinatario = "";
                    this.getView().byId("Note").setValue("");
                    this.getView().byId("AreaVendite").setValue("");
                    if (this.Testata.Vbeln !== undefined) {
                        this.ArticoliOrdine = this.Testata.Item;
                        //this.getView().byId("DataConsegna").setValue(this.Testata.EDATU.toLocaleDateString('it'));
                        this.getView().byId("AreaVendite").setValue(this.Testata.AreaVendite);
                        if (this.Testata.AreaVendite === "Surgelato") {
                            this.getView().byId("AreaVendite").setSelectedKey("OPSU");
                        } else {
                            this.getView().byId("AreaVendite").setSelectedKey("OPCF");
                        }
                        this.getView().byId("Note").setValue(this.Testata.Note);
                        this.getView().byId("DestinazioneMerci").setValue(this.Testata.Item[0].DESTINATARIO);
                        this.keydestinatario = aResults[1].find(x => x.INDIRIZZO === this.Testata.Item[0].DESTINATARIO).KUNNR;
                        this.getView().byId("DestinazioneMerci").setSelectedKey(this.keydestinatario);
                    } else {
                        aResults[1].forEach(x => {
                            if (x.DEFPA !== "") {
                                destinatario = x.INDIRIZZO;
                                this.keydestinatario = x.CODICEDESTINATARIO;
                            }
                        });
                        this.getView().byId("DestinazioneMerci").setValue(destinatario);
                    }

                    var date = new Date();
                    date.setDate(date.getDate() + 3);
                    this.getView().byId("DataConsegna").setValue(date.toLocaleDateString('it'));
                    oAppModel.setProperty("/DestinazioneMerci", aResults[1]);
                    if (aResults[0] !== undefined) {
                        this.KUNNR = aResults[0][0].KUNNR;
                        this.AUART = aResults[0][0].AUART;
                        this.VTWEG = aResults[0][0].VTWEG;
                        this.SPART = aResults[0][0].SPART;
                    } else {
                        this.KUNNR = String(this.Testata.Kunnr).padStart(10, "0");
                    }
                    if (this.Testata.Vbeln !== undefined) {
                        this.onInitArticoliCatalogo();
                    }
                    this._setTableModel(this.ArticoliOrdine);
                }, oError => {
                    MessageToast.show(this.oComponent.i18n().getText("msg.error.recuperoordine.text"));
                    this.oComponent.resetAllBusy();
                });
            },
            onChangeDestinatarioMerci: function (oEvent) {
                const oAppModel = this.getView().getModel("appModel");
                this.keydestinatario = this.getView().byId("DestinazioneMerci").getSelectedKey();
            },
            onDataChange: function (oEvent) {
                const oAppModel = this.getView().getModel("appModel");
                var dateParts = this.getView().byId("DataConsegna").getValue().replaceAll(".", "/");
                this.getView().byId("DataConsegna").setValue(dateParts);
            },
            onChangeAreaVendite: function (oEvent) {
                if (this.VKORG !== this.getView().byId("AreaVendite").getSelectedKey()) {
                    this.ArticoliOrdine = [];
                    this._setTableModel(this.ArticoliOrdine);
                }
                const oFinalFilter = new Filter({
                    filters: [],
                    and: true
                });
                const oFinalFilterCatalogo = new Filter({
                    filters: [],
                    and: true
                });
                const oOrderFilter = new Filter({
                    filters: [],
                    and: true
                });
                this.KunnrFilter = String(this.KUNNR).padStart(10, "0");
                let aKunnrFilter = [];
                aKunnrFilter.push(new Filter("KUNNR", FilterOperator.EQ, this.KunnrFilter));
                this.VKORG = this.getView().byId("AreaVendite").getSelectedKey();
                this.VkorgFilter = String(this.VKORG).padStart(4, "0");
                let aVkorgFilter = [];
                aVkorgFilter.push(new Filter("VKORG", FilterOperator.EQ, this.VkorgFilter));
                oFinalFilter.aFilters.push(new Filter({
                    filters: aKunnrFilter,
                    and: false
                }));
                oFinalFilter.aFilters.push(new Filter({
                    filters: aVkorgFilter,
                    and: false
                }));
                oFinalFilterCatalogo.aFilters.push(new Filter({
                    filters: aKunnrFilter,
                    and: false
                }));
                oFinalFilterCatalogo.aFilters.push(new Filter({
                    filters: aVkorgFilter,
                    and: false
                }));
                oOrderFilter.aFilters.push(new Filter({
                    filters: aKunnrFilter,
                    and: false
                }));
                oOrderFilter.aFilters.push(new Filter({
                    filters: aVkorgFilter,
                    and: false
                }));
                const oPromiseOrdini = new Promise((resolve, reject) => {
                    this.getView().getModel().read("/CreazioneOrdineSet", {
                        filters: [oOrderFilter],
                        success: (aData) => {
                            resolve(aData.results);
                        },
                        error: (oError) => {
                            reject;
                        }
                    });
                });
                oPromiseOrdini.then((aResults) => {
                    this.KUNNR = aResults[0].KUNNR;
                    this.AUART = aResults[0].AUART;
                    this.VTWEG = aResults[0].VTWEG;
                    this.SPART = aResults[0].SPART;
                    this.VtwegFilter = String(this.VTWEG).padStart(2, "0");
                    let aVtwegFilter = [];
                    aVtwegFilter.push(new Filter("VTWEG", FilterOperator.EQ, this.VtwegFilter));
                    oFinalFilter.aFilters.push(new Filter({
                        filters: aVtwegFilter,
                        and: false
                    }));
                    oFinalFilterCatalogo.aFilters.push(new Filter({
                        filters: aVtwegFilter,
                        and: false
                    }));
                    let aSpartFilter = [];
                    aSpartFilter.push(new Filter("SPART", FilterOperator.EQ, this.SPART));
                    oFinalFilter.aFilters.push(new Filter({
                        filters: aSpartFilter,
                        and: false
                    }));
                    const oPromiseArticoli = new Promise((resolve, reject) => {
                        this.getView().getModel().read("/CreazioneArticoliSet", {
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
                        this.getView().getModel().read("/CreazioneCatalogoSet", {
                            filters: [oFinalFilterCatalogo],
                            success: (aData) => {
                                resolve(aData.results);
                            },
                            error: (oError) => {
                                reject;
                            }
                        });
                    });
                    Promise.all([oPromiseArticoli, oPromiseCatalogo]).then((aResults) => {
                        this.Articoli = aResults[0];
                        this.Articoli.forEach(x => {
                            x.FILTER = x.CODARTICOLO + " " + x.DESCRARTICOLO;
                        });
                        this.Catalogo = aResults[1];
                    }, oError => {
                        MessageToast.show(this.oComponent.i18n().getText("msg.error.recuperoordine.text"));
                        this.oComponent.resetAllBusy();
                    });
                }, oError => {
                    MessageToast.show(this.oComponent.i18n().getText("msg.error.recuperoordine.text"));
                    this.oComponent.resetAllBusy();
                });
            },
            onInitArticoliCatalogo: function (oEvent) {
                const oFinalFilter = new Filter({
                    filters: [],
                    and: true
                });
                const oFinalFilterCatalogo = new Filter({
                    filters: [],
                    and: true
                });
                this.KunnrFilter = String(this.KUNNR).padStart(10, "0");
                let aKunnrFilter = [];
                aKunnrFilter.push(new Filter("KUNNR", FilterOperator.EQ, this.KunnrFilter));
                if (this.getView().byId("AreaVendite").getValue() === "Surgelato") {
                    this.VKORG = "OPSU";
                } else {
                    this.VKORG = "OPCF";
                }
                this.VkorgFilter = String(this.VKORG).padStart(4, "0");
                let aVkorgFilter = [];
                aVkorgFilter.push(new Filter("VKORG", FilterOperator.EQ, this.VkorgFilter));
                this.VtwegFilter = String(this.VTWEG).padStart(2, "0");
                let aVtwegFilter = [];
                aVtwegFilter.push(new Filter("VTWEG", FilterOperator.EQ, this.VtwegFilter));
                let aSpartFilter = [];
                aSpartFilter.push(new Filter("SPART", FilterOperator.EQ, this.SPART));
                oFinalFilter.aFilters.push(new Filter({
                    filters: aKunnrFilter,
                    and: false
                }));
                oFinalFilter.aFilters.push(new Filter({
                    filters: aVkorgFilter,
                    and: false
                }));
                oFinalFilter.aFilters.push(new Filter({
                    filters: aVtwegFilter,
                    and: false
                }));
                oFinalFilter.aFilters.push(new Filter({
                    filters: aSpartFilter,
                    and: false
                }));
                oFinalFilterCatalogo.aFilters.push(new Filter({
                    filters: aKunnrFilter,
                    and: false
                }));
                oFinalFilterCatalogo.aFilters.push(new Filter({
                    filters: aVkorgFilter,
                    and: false
                }));
                oFinalFilterCatalogo.aFilters.push(new Filter({
                    filters: aVtwegFilter,
                    and: false
                }));

                const oPromiseArticoli = new Promise((resolve, reject) => {
                    this.getView().getModel().read("/CreazioneArticoliSet", {
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
                    this.getView().getModel().read("/CreazioneCatalogoSet", {
                        filters: [oFinalFilterCatalogo],
                        success: (aData) => {
                            resolve(aData.results);
                        },
                        error: (oError) => {
                            reject;
                        }
                    });
                });
                Promise.all([oPromiseArticoli, oPromiseCatalogo]).then((aResults) => {
                    this.Articoli = aResults[0];
                    this.Articoli.forEach(x => {
                        x.FILTER = x.CODARTICOLO + " " + x.DESCRARTICOLO;
                    });
                    this.Catalogo = aResults[1];
                }, oError => {
                    MessageToast.show(this.oComponent.i18n().getText("msg.error.recuperoordine.text"));
                    this.oComponent.resetAllBusy();
                });
            },
            onNavBack: function () {
                var oHistory = History.getInstance();
                var sPreviousHash = oHistory.getPreviousHash();
                if (sPreviousHash !== undefined) {
                    if (History._aStateHistory.find(x => x.includes("zportaleordini-display&/RouteView2")) !== undefined) {
                        window.history.go(-2);
                    } else {
                        window.history.go(-1);
                    }
                } else {
                    var oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("RouteView1", {}, true);
                }
            },
            onAggiungiArticolo: function () {
                this.oSelectionScreenDialog = null;
                this._createSelectionScreenDialog();
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
                    this.ArticoliOrdine.push(JSON.parse(JSON.stringify(x)));
                });
                this._setTableModel(this.ArticoliOrdine);
                this.oSelectionScreenDialog.close();
                this.onAfterCloseSelectionScreenDialog;
            },
            onSalvaArticoli: function (oEvent) {
                this.Articoli.forEach(x => {
                    if (x.Changed === true) {
                        this.ArticoliOrdine.push(JSON.parse(JSON.stringify(x)));
                        x.Changed = false;
                    }
                });
                this._setTableModel(this.ArticoliOrdine);
                this.oSelectionScreenDialog.close();
                this.onAfterCloseSelectionScreenDialog;
            },
            onElimina: function (oEvent) {
                for (var i = 0; i < this.ArticoliOrdine.length; i++) {
                    if (this.ArticoliOrdine[i] === oEvent.getSource().getParent().getRowBindingContext().getObject()) {
                        this.ArticoliOrdine.splice(i, 1);
                    }
                }
                this._setTableModel(this.ArticoliOrdine);
            },
            onSalvaOrdine: function () {
                this.oComponent.busy(true);
                this.ControlloOrdine();
                if (this.Controlli === "") {
                    var DeliveryBlockReason = this.getView().byId("StatoElaborazione").getValue();
                    var Note = this.getView().byId("Note").getValue();
                    if (DeliveryBlockReason === "Draft") {
                        DeliveryBlockReason = "Z1";
                    } else {
                        DeliveryBlockReason = "Z2";
                    }
                    var resultsItem = {
                        "results": []
                    };
                    var resultsText = {
                        "results": []
                    };
                    var resultsPartner = {
                        "results": []
                    };
                    //var date = sap.ui.model.odata.ODataUtils.formatValue(new Date(this.getView().byId("DataConsegna").getValue()), "Edm.DateTime");
                    var dateParts = this.getView().byId("DataConsegna").getValue().split("/");
                    var date = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
                    date.setHours(date.getHours() - date.getTimezoneOffset() / 60);
                    date = date.getTime();
                    date = "/Date(" + date + ")/";
                    var Order = {
                        "SalesOrderType": this.AUART,
                        "SalesOrganization": this.VKORG,
                        "DistributionChannel": this.VTWEG,
                        "OrganizationDivision": this.SPART,
                        //"SoldToParty": this.keydestinatario.padStart(10, 0),
                        "SoldToParty": this.KUNNR.padStart(10, 0),
                        "PurchaseOrderByCustomer": "PortaleOrdine",
                        "RequestedDeliveryDate": date,
                        "DeliveryBlockReason": DeliveryBlockReason,
                        "to_Item": resultsItem,
                        "to_Text": resultsText,
                        "to_Partner": resultsPartner
                    }
                    for (var i = 0; i < this.ArticoliOrdine.length; i++) {
                        var resultsScheduleLine = {
                            "results": []
                        };
                        if (this.ArticoliOrdine[i].UDM === "Cartoni") {
                            this.ArticoliOrdine[i].UDM = "CT";
                        } else if (this.ArticoliOrdine[i].UDM === "Strati") {
                            this.ArticoliOrdine[i].UDM = "STR";
                        } else if (this.ArticoliOrdine[i].UDM === "Pallet") {
                            this.ArticoliOrdine[i].UDM = "PAL";
                        }
                        var Item = {
                            "Material": this.ArticoliOrdine[i].CODARTICOLO,
                            //"SalesOrderItem": i,
                            "RequestedQuantity": this.ArticoliOrdine[i].QUANTITA,
                            "RequestedQuantityUnit": this.ArticoliOrdine[i].UDM,
                            "to_ScheduleLine": resultsScheduleLine
                        };
                        var ScheduleLine = {
                            "RequestedDeliveryDate": date
                        };
                        Order.to_Item.results.push(Item);
                        Order.to_Item.results[i].to_ScheduleLine.results.push(ScheduleLine);
                    }
                    var language = navigator.language.substring(0, 2).toUpperCase();
                    this.Note = Note;
                    if (this.Note === "" || this.Note === undefined) {
                        this.Note = "-";
                        Note = "-";
                    }
                    //Order.push(resultsText);
                    var Text = {
                        "Language": language,
                        "LongTextID": "ZO01",
                        "LongText": Note
                    }
                    Order.to_Text.results.push(Text);
                    //}
                    /*var PartnerCM = {
                        "PartnerFunction": "CM",
                        "Customer": this.KUNNR.padStart(10, 0)
                    }
                    Order.to_Partner.results.push(PartnerCM);
                    var PartnerEP = {
                        "PartnerFunction": "EP",
                        "Customer": this.KUNNR.padStart(10, 0)
                    }
                    Order.to_Partner.results.push(PartnerEP);
                    var PartnerDF = {
                        "PartnerFunction": "DF",
                        "Customer": this.KUNNR.padStart(10, 0)
                    }
                    Order.to_Partner.results.push(PartnerDF);
                    */
                    var PartnerDM = {
                        "PartnerFunction": "DM",
                        "Customer": this.keydestinatario.padStart(10, 0)
                    }
                    Order.to_Partner.results.push(PartnerDM);
                    if (this.AUART === "ZCD4") {
                        var PartnerBV = {
                            "PartnerFunction": "BV",
                            "Customer": this.keydestinatario.padStart(10, 0)
                        }
                        Order.to_Partner.results.push(PartnerBV);
                    }
                    if (this.Testata.Agente === "X") {
                        var PartnerZA = {
                            "PartnerFunction": "ZA",
                            //"Customer": this.keydestinatario.padStart(10, 0)
                            "Customer": this.getOwnerComponent().getNumeroAgente()
                        }
                        Order.to_Partner.results.push(PartnerZA);
                    }
                    const oSaveOrdine = new Promise((resolve, reject) => {
                        $.ajax({
                            cache: false,
                            crossDomain: true,
                            async: true,
                            type: "GET",
                            url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder",
                            headers: {
                                "Accept": "*/*",
                                "x-csrf-token": "fetch"
                            },
                            success: (oData, sTextStatus, oRequest) =>
                                this._PostSalesOrder(
                                    oRequest,
                                    Order,
                                    resolve,
                                    reject),
                            error: (oError) => {
                                reject(this.oComponent.i18n().getText("msg.error.salvaOrdine.text"));
                            }
                        });
                    });
                    oSaveOrdine.then(() => {
                        MessageToast.show(this.oComponent.i18n().getText("msg.success.salvaOrdine.text"));
                        this.oComponent.resetAllBusy();
                        this.onNavBack();
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
            //oTable.sort(oTable.getColumns()[0]);
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
        oAppController.prototype.ControlloOrdine = function () {
            var Errori = "";
            this.ArticoliOrdine.forEach(x => {
                if (x.UDM === "" || x.QUANTITA === "" || x.UDM === undefined || x.QUANTITA === undefined) {
                    Errori = "Aggiungere l'unità di misura e la quantità per ogni riga";
                }
            });
            if (this.ArticoliOrdine.length === 0) {
                if (Errori !== "") {
                    Errori = Errori + "\nAggiungere almeno una posizione nell'ordine"
                } else {
                    Errori = "Aggiungere almeno una posizione nell'ordine";
                }
            }
            if (this.getView().byId("DestinazioneMerci").getSelectedKey() === "") {
                if (Errori !== "") {
                    Errori = Errori + "\nAggiungere destinatario merci"
                } else {
                    Errori = "Aggiungere destinatario merci";
                }
            }
            if (this.getView().byId("DataConsegna").getValue() === "") {
                if (Errori !== "") {
                    Errori = Errori + "\nAggiungere data consegna nell'ordine"
                } else {
                    Errori = "Aggiungere data consegna nell'ordine";
                }
            }
            if (this.getView().byId("AreaVendite").getSelectedKey() === "") {
                if (Errori !== "") {
                    Errori = Errori + "\nAggiungere l'area vendite nell'ordine"
                } else {
                    Errori = "Aggiungere l'area vendite nell'ordine";
                }
            }
            if (this.getView().byId("StatoElaborazione").getValue() === "") {
                if (Errori !== "") {
                    Errori = Errori + "\nAggiungere stato elaborazione"
                } else {
                    Errori = "Aggiungere stato elaborazione";
                }
            }
            if (Errori !== "") {
                this.Controlli = "X";
                MessageToast.show(Errori);
                this.oComponent.resetAllBusy();
            } else {
                this.Controlli = "";
            }
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
        oAppController.prototype._PostSalesOrder = function (oRequest, Order, resolve, reject) {
            const sToken = this._getToken(oRequest);
            this.Order = Order;
            if (sToken) {
                $.ajax({
                    cache: false,
                    crossDomain: true,
                    //                   dataType: "json",
                    async: true,
                    type: "POST",
                    url: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder",
                    headers: {
                        "Accept": "*/*",
                        "Content-Type": "application/json",
                        "x-csrf-token": sToken
                    },
                    data: JSON.stringify(Order),
                    success: (oData, sTextStatus, oRequest) => {
                        const oPromiseSendEmail = new Promise((resolve, reject) => {
                            if (this.Order.DeliveryBlockReason === "Z2") {
                                var Vbeln = oRequest.responseText.split("A_SalesOrder('")[1].split("')")[0];
                                var Email = {
                                    "VBELN": Vbeln,
                                    "Note": this.Note,
                                    "VTWEG": this.VTWEG,
                                    "VKORG": this.VKORG
                                };
                                this.getView().getModel().create("/SendEmailSet", Email, {
                                    success: () => {
                                        resolve();
                                    },
                                    error: (oError) => {
                                        reject(this.oComponent.i18n().getText("msg.error.sendemail.text"));
                                    }
                                }, [], true);
                            } else {
                                resolve();
                            }
                        });
                        oPromiseSendEmail.then(() => {
                            this.oComponent.resetAllBusy();
                            resolve(this.oComponent.i18n().getText("msg.success.salvaOrdine.text"));
                            this.oComponent.setRicerca("X");
                        },
                            oError => {
                                this.oComponent.resetAllBusy();
                                reject(this.oComponent.i18n().getText("msg.error.sendemail.text"));
                            });
                    },
                    error: (oError) => {
                        this.oComponent.resetAllBusy();
                        reject(this.oComponent.i18n().getText("msg.error.salvaOrdine.text"));
                    }
                });
            } else {
                reject(this.oComponent.i18n().getText("msg.error.salvaOrdine.text"));
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