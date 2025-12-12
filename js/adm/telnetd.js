define([ 'jquery','lib/jquery/jQuery.fileinput', 'service', 'knockout', 'config/config', 'status/statusBar'], function ($, fileinput, service, ko, config, status) {

    function TelnetAdbVM() {
        var self = this;
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
		self.updateType = ko.observable(service.getUpdateType().update_type);
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

        self.telnetMode = ko.observable(service.getTelnetAdb().telnetMode==="1"?"1":"0");
        self.adbMode = ko.observable(service.getTelnetAdb().adbMode==="1"?"1":"0");
	    // self.twtoolmode = ko.observable(service.getTelnetAdb().twtoolmode);
	    // self.twlogmode = ko.observable(service.getTelnetAdb().twlogmode);
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
         * 自动检测设置按钮事件
         * @method apply
         */
        self.apply = function () {
            var para = {
                telnet : self.telnetMode()==="1"?"1":"0",
                adb : self.adbMode()==="1"?"1":"0"
				// twtoolmode: self.twtoolmode(),
				// twlogmode: self.twlogmode(),
            };
            showLoading();
            service.setTelnetadbSetting(para, function (data) {
                if (data && data.result == "success") {
                    successOverlay();
                } else {
                    errorOverlay();
                }
            });
        };
	}

    /**
     * 初始化
     * @method init
     */	
    function init() {
        var container = $('#container')[0];
        ko.cleanNode(container);
        var vm = new TelnetAdbVM();
        ko.applyBindings(vm, container);		
		

        $('#frmtelnetadb').validate({
            submitHandler: function () {
                vm.apply();
            }
        });
    }

    return {
        init: init
    };
});
