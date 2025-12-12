define(['jquery', 'knockout', 'config/config', 'service', 'underscore'],

    function ($, ko, config, service, _) {

        var ttlSetModes = _.map(config.ttlSetModes, function (item) {
            return new Option(item.name, item.value);
        });

        function TTLVM() {
            var self = this;
            self.ttlSetModes = ko.observableArray(ttlSetModes);
            self.ttl_enable = ko.observable();
            self.ipv4_ttl_value = ko.observable();
            var data = service.getTTLParams();
            self.ttl_enable(data.ttl_enable);
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
            self.ipv4_ttl_value(data.ipv4_ttl_value);

            self.sleepmode_display = ko.observable(service.getLanInfo().sleepmode_display==='yes');
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
            self.showtr069 = ko.observable(service.showTr069().tr069_need_display === 'yes' ? true : false);
            self.showvpn = ko.observable(service.showVPN().use_vpn_state === '1' ? true : false);
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

            self.setTTL = function () {
                showLoading('waiting');
                var params = {
                    ipv4_ttl_value: self.ipv4_ttl_value()
                };
                var res = service.setTTL(params);
                if (res.result === 'success') {
                    successOverlay();
                } else {
                    errorOverlay();
                }
            };

        }

        /**
         * 初始化port filter view model
         * @method init
         */
        function init(viewModel) {
            var vm = new TTLVM();
            var container = $('#container');
            ko.cleanNode(container[0]);
            ko.applyBindings(vm, container[0]);

            $('#ttl_form').validate({
                submitHandler: function () {
                    vm.setTTL();
                },
            });
        }

        return {
            init: init
        };
    });
