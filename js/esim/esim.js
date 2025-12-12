define(['jquery', 'knockout', 'config/config', 'service', 'underscore'],

    function ($, ko, config, service, _) {
        var EsimSimPwdPage = 0;
        var EsimSimSettingPage = 1;

        function EsimSimVM() {
            var self = this;
            self.EsimSim_enable = ko.observable();
            self.Esim_num = ko.observable();
            self.Esim_num0 = ko.observable('SIM');
            self.Esim_num1 = ko.observable('ESIM');
            self.Esim_num2 = ko.observable('ESIM2');
            self.password = ko.observable();
            self.Esim_login_psw_mode = ko.observable();
            self.currentPage = ko.observable(EsimSimPwdPage);

            var data = service.getEsimSimParams();
            self.EsimSim_enable(data.EsimSim_enable);
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

            if(data.user_web_disp_sim_support){
                var sim012_display_arr = data.user_web_disp_sim_support.split(";")
                if (sim012_display_arr[0]){self.Esim_num0(sim012_display_arr[0]) }
                if (sim012_display_arr[1]){self.Esim_num1(sim012_display_arr[1]) }
                if (sim012_display_arr[2]){self.Esim_num2(sim012_display_arr[2]) }
                for (let i = 0; i < sim012_display_arr.length; i++) {
                    const element = sim012_display_arr[i];
                    if (i == 0 && element == "none") {
                        self.Esim_num0(false)
                    }
                    if (i == 1 && element == "none") {
                        self.Esim_num1(false)
                    }
                    if (i == 2 && element == "none") {
                        self.Esim_num2(false)
                    }
                    
                }
            }
            self.Esim_num(data.Esim_num);
            self.Esim_login_psw_mode(data.Esim_login_psw_mode);

            if(self.Esim_login_psw_mode()=='0')
                self.currentPage(EsimSimSettingPage);
            else 
                self.currentPage(EsimSimPwdPage);

            self.sleepmode_display = ko.observable(service.getLanInfo().sleepmode_display==='yes');
            self.hasUssd = config.HAS_USSD;
        self.user_web_disp_internet_ussd = ko.observable(service.getStatusInfo().user_web_disp_internet_ussd);
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

            var info = getEsimSimSetting();
            self.EsimSimSetting = ko.observable(info.EsimSimSetting);

            self.save = function() {
                showConfirm("lan_confirm_reopen", function () {
                    self.saveAct();
                });
            };
            self.saveAct = function () {
                if(self.Esim_login_psw_mode()=='0')
                    self.currentPage(EsimSimSettingPage);
                else 
                    self.currentPage(EsimSimPwdPage);
                showLoading();
                var params = {};
                params.EsimSimSetting = self.EsimSimSetting();
                service.setEsimSimSetting(params, function(result) {
                    if (result.result == "success") {
                        successOverlay();
                        //self.clear();
                    } else {
                        errorOverlay();
                }
                });
            };

            /**
             * login 事件处理
             * @event login
             */
             self.login = function () {
                
                service.login_EsimSim({
                    password: self.password(),
                }, function (data) {
                    if (data.result) {
                        //登陆成功
                        self.password("");
                        self.currentPage(EsimSimSettingPage);
                    } else {
                        self.password("");
                        showAlert("password_error", function () {
                        //setFocus();
                        });
                    }
                    
                });
            };
        }

        /**
        * 获取EsimSim信息
        * @method getEsimSimSetting
        */
        function getEsimSimSetting() {
            return service.getEsimSimSetting();
        }

        /**
         * 初始化port filter view model
         * @method init
         */
        function init(viewModel) {
            var vm = new EsimSimVM();
            var container = $('#container');
            ko.cleanNode(container[0]);
            ko.applyBindings(vm, container[0]);

            $('#EsimSim_Pwd_form').validate({
                submitHandler: function () {
                    vm.login();
                },
            });

            $('#EsimSim_Setting_form').validate({
                submitHandler: function () {
                    vm.save();
                },
            });
        }

        return {
            init: init
        };
    });
