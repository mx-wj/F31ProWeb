/**
 * @module sleep_mode ：包括WiFi休眠、WiFi覆盖范围、WiFi定时休眠唤醒上功能
 * @class sleep_mode
 */
define([ 'jquery', 'knockout', 'config/config', 'service', 'underscore' ],

function($, ko, config, service, _) {

    var sleepModes = _.map(config.SLEEP_MODES, function(item) {
        return new Option(item.name, item.value);
    });

    /**
     * sleepmode VM
     * @class SleepModeVM
     */
	function SleepModeVM() {
        var self = this;
        var info = getSleepMode();
        self.isCPE = config.PRODUCT_TYPE == 'CPE';
        self.showTSWDiv = config.TSW_SUPPORT;
        self.showSleepDiv = config.WIFI_SLEEP_SUPPORT;
		self.hasUssd = config.HAS_USSD;
        self.user_web_disp_internet_ussd = ko.observable(service.getStatusInfo().user_web_disp_internet_ussd);
        if (localStorage.getItem('admin_root') == 1) {
            service.custEnableWebuiMenu().cust_webui_menu.forEach(element => {
                if (element.ussd) {
                    if (element.ussd == 1) {
                        self.user_web_disp_internet_ussd(true);
                    }else if (element.ussd == 0){
                        self.user_web_disp_internet_ussd(false);
                    }
                }
            });
        }
		self.hasUpdateCheck = config.HAS_UPDATE_CHECK;
        self.sleepmode_display = ko.observable(service.getLanInfo().sleepmode_display==='yes');
        			self.net_selfcheck_display = ko.observable(service.getLanInfo().net_selfcheck_display != 'no' || service.getLoginMode().login_mode == 'root');
                    if (localStorage.getItem('admin_root') == 1) {
                        service.custEnableWebuiMenu().cust_webui_menu.forEach(element => {
                            if (element.break_detection) {
                                if (element.break_detection == 1) {
                                    self.net_selfcheck_display(true);
                                }else if (element.break_detection == 0){
                                    self.net_selfcheck_display(false);
                                }
                            }
                        });
                    }
		config.DDNS_SUPPORT = ko.observable(service.getLanInfo().user_web_hide_ddns !='1');
		self.hasDdns = config.DDNS_SUPPORT;
        self.hasTelnetd = ko.observable(service.getLoginMode().login_mode);
		self.hastr069 = ko.observable(config.HAS_TW_TR069);

        self.modes = ko.observableArray(sleepModes);
        self.selectedMode = ko.observable(info.sleepMode);

        var wifiRangeInfo = getWifiRange();

        self.wifiRangeMode = ko.observable(wifiRangeInfo.wifiRangeMode);

        self.ttl_enable = ko.observable(service.getTTLParams().ttl_enable);
        if (localStorage.getItem('admin_root') == 1) {
            service.custEnableWebuiMenu().cust_webui_menu.forEach(element => {
                if (element.advance3111) {
                    if (element.advance3111 == 1) {
                        self.ttl_enable(1);
                    }else if (element.advance3111 == 0){
                        self.ttl_enable(0);
                    }
                }
            });
        }
        self.imei_enable = ko.observable(service.getIMEIParams().imei_enable);
        if (localStorage.getItem('admin_root') == 1) {
            service.custEnableWebuiMenu().cust_webui_menu.forEach(element => {
                if (element.advance3112) {
                    if (element.advance3112 == 1) {
                        self.imei_enable(1);
                    }else if (element.advance3112 == 0){
                        self.imei_enable(0);
                    }
                }
            });
        }
        self.EsimSim_enable = ko.observable(service.getEsimSimParams().EsimSim_enable);
        if (localStorage.getItem('admin_root') == 1) {
            service.custEnableWebuiMenu().cust_webui_menu.forEach(element => {
                if (element.advance3113) {
                    if (element.advance3113 == 1) {
                        self.EsimSim_enable(1);
                    }else if (element.advance3113 == 0){
                        self.EsimSim_enable(0);
                    }
                }
            });
        }

        /**
         * 设置wifi休眠模式
         * @method setSleepMode
         */
        self.setSleepMode = function() {
            showLoading('waiting');
            service.getWpsInfo({}, function (info) {
                if (info.radioFlag == '0') {
                    showAlert('wps_wifi_off');
                } else if (info.wpsFlag == '1') {
                    showAlert('wps_on_info');
                } else {
                    self.setSleepModeAct();
                }
            });
        };

        self.setSleepModeAct = function() {
            var params = {};
            params.sleepMode = self.selectedMode();
            service.setSleepMode(params, function(result) {
                if (result.result == "success") {
                    successOverlay();
                } else {
                    errorOverlay();
                }
            });
        };

        /**
         * 设置wifi覆盖范围
         * @method setWifiRange
         */
        self.setWifiRange = function() {            
            service.getWpsInfo({}, function (info) {
                if (info.radioFlag == '0') {
                    showAlert('wps_wifi_off');
                } else if (info.wpsFlag == '1') {
                    showAlert('wps_on_info');
                } else {
                    showConfirm('wifi_sleep_confirm', function () {
                        showLoading('waiting');
                        self.setWifiRangeAct();
                    });
                    
                }
            });
        };

        self.setWifiRangeAct = function() {
            var params = {};
            params.wifiRangeMode = self.wifiRangeMode();
            service.setWifiRange(params, function(result) {
                if (result.result == "success") {
                    successOverlay();
                } else {
                    errorOverlay();
                }
            });
        };

        var tsw = service.getTsw();
        self.openEnable = ko.observable(tsw.openEnable == ""? '0' : tsw.openEnable);
        self.openH = ko.observable(tsw.openH);
        self.openM = ko.observable(tsw.openM);
        self.closeH = ko.observable(tsw.closeH);
        self.closeM = ko.observable(tsw.closeM);
        /**
         * 设置wifi定时休眠唤醒
         * @method saveTsw
         */
        self.saveTsw = function () {
            if(self.openEnable() == '1') {
                if (Math.abs((self.openH() * 60 + parseInt(self.openM(), 10)) - (self.closeH() * 60 + parseInt(self.closeM(), 10))) < 10) {
                    showAlert('tsw_time_interval_alert');
                    return false;
                }
                        showLoading('waiting');
                        service.saveTsw({
                            openEnable: self.openEnable(),
                            closeEnable: self.openEnable(),
                            openTime: leftInsert(self.openH(), 2, '0') + ':' + leftInsert(self.openM(), 2, '0'),
                            closeTime: leftInsert(self.closeH(), 2, '0') + ':' + leftInsert(self.closeM(), 2, '0')
                        }, function (data) {
                            if (data && data.result == "success") {
                                successOverlay();
                            } else {
                                errorOverlay();
                            }
                        }, $.noop);
            } else {
                showLoading('waiting');
                service.saveTsw({
                    openEnable: self.openEnable(),
                    closeEnable: self.openEnable()
                }, function (data) {
                    if (data && data.result == "success") {
                        successOverlay();
                    } else {
                        errorOverlay();
                    }
                }, $.noop);
            }

        };

    }

    /**
     * 获取wifi覆盖范围信息
     * @method getWifiRange
     */
    function getWifiRange() {
        return service.getWifiRange();
    }

    /**
     * 获取wifi休眠模式
     * @method getSleepInfo
     */
    function getSleepMode() {
        return service.getSleepMode();
    }

    /**
     * 初始化sleep mode view model
     * @method init
     */
	function init() {
		var container = $('#container');
		ko.cleanNode(container[0]);
		var vm = new SleepModeVM();
		ko.applyBindings(vm, container[0]);
        $('#sleepModeForm').validate({
            submitHandler : function() {
                vm.setSleepMode();
            }
        });

        $('#wifiRangeForm').validate({
            submitHandler : function() {
                vm.setWifiRange();
            }
        });

        $('#frmTsw').validate({
            submitHandler: function () {
                vm.saveTsw();
            },
            errorPlacement: function (error, element) {
                if (element.attr("name") == "openH" || element.attr("name") == "openM") {
                    $("#openErrorDiv").html(error);
                } else if (element.attr("name") == "closeH" || element.attr("name") == "closeM") {
                    $("#closeErrorDiv").html(error);
                } else {
                    error.insertAfter(element);
                }
            }
        });
	}

	return {
		init : init
	};
});
