/**
 * 系统状态设置模块
 * @module Systerm Statue
 * @class DDNS
 */
define(['require', 'jquery', "service", 'underscore', 'knockout', 'config/config'],
	function (require, $, service, _, ko, config) {
	function VPNVM() {
        var self = this;
//		var info = getL2TPMode();
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
		self.showtr069 = ko.observable(service.showTr069().tr069_need_display === 'yes' ? true : false);
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

		var params;
		var data = service.getVPNInfo();
		self.connect_status = ko.observable();
		self.currentType = ko.observable('L2TP');
		self.connectType = ko.observableArray(
			_.map([
				{ name: 'L2TP VPN client', value: 'L2TP' },
				{ name: 'PPTP VPN client', value: 'PPTP' }
			], function (i) {
				return new Option(i.name, i.value);
			})
		)
		self.enableL2TP = ko.observable();
		self.lns_address = ko.observable();
		self.host_name = ko.observable();
		self.tunnei_pass = ko.observable();
		self.handshake = ko.observable();
		self.ppp_user = ko.observable();
		self.ppp_pass = ko.observable();
		self.authList = ko.observableArray(
			_.map([
				{ name: 'Auto', value: 'auto' },
				{ name: 'CHAP', value: 'chap' },
				{ name: 'PAP', value: 'pap' }
			], function (i) {
				return new Option(i.name, i.value);
			})
		);
		var data = service.getVPNInfo();
		self.enableL2TP(Number(data.l2tp_enable) ? true : false);
		self.lns_address(data.l2tp_server);
		self.host_name(data.l2tp_name);
		self.tunnei_pass(data.l2tp_tunnel_pswd);
		self.handshake(data.l2tp_interval);
		self.ppp_user(data.l2tp_user);
		self.ppp_pass(data.l2tp_passwd);
		
		self.currentAuth = ko.observable("Auto");
		var timer = setInterval(function () {
			if (self.currentType() == 'L2TP') {
				var data = service.getVPNInfo();
				self.connect_status(data.l2tp_status == 'connected' ? $.i18n.prop('connected') : $.i18n.prop('disconnected'));
            } else {
				var data2 = service.getVPNInfoPptp();
				self.connect_status(data2.pptp_status == 'connected' ? $.i18n.prop('connected') : $.i18n.prop('disconnected'));
            }
		}, 1000);
		
		self.connectTypeChangeHandler = function () {
			if (self.currentType() == 'L2TP') {
				var data = service.getVPNInfo();
				self.enableL2TP(Number(data.l2tp_enable) ? true : false);
				self.lns_address(data.l2tp_server);
				self.host_name(data.l2tp_name);
				self.tunnei_pass(data.l2tp_tunnel_pswd);
				self.handshake(data.l2tp_interval);
				self.ppp_user(data.l2tp_user);
				self.ppp_pass(data.l2tp_passwd);
				} else {
				var data2 = service.getVPNInfoPptp();
				self.enableL2TP(Number(data2.pptp_enable) ? true : false);
				self.lns_address(data2.pptp_server);
				self.host_name(data2.pptp_name);
				self.tunnei_pass(data2.pptp_tunnel_pswd);
				self.handshake(data2.pptp_interval);
				self.ppp_user(data2.pptp_user);
				self.ppp_pass(data2.pptp_passwd);
				self.currentAuth(data2.pptp_auth_type);
				}
		}
		function fn() {
			clearInterval(timer);
			window.removeEventListener('hashchange', fn);
		}
		window.addEventListener('hashchange', fn);
		
		//for pptp
		self.apply = function () {
			var trueIP = true;
			$('.ipAddress').each(function () {
				var reg1 = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)|([a-zA-Z]+\.\w+\.\w+)$/;
				if (!reg1.test($(this).val())) {
					trueIP = false;
					showAlert("trueIP");
					$(this).focus();
					return false;
				}
			})
			if (trueIP) {
				if (self.currentType() == 'L2TP') {
					params = {
						l2tp_status: self.connect_status(),
						l2tp_enable: self.enableL2TP() ? '1' : '0',
						l2tp_server: self.lns_address(),
						l2tp_name: self.host_name(),
						l2tp_tunnel_pswd: self.tunnei_pass(),
						l2tp_interval: self.handshake(),
						l2tp_user: self.ppp_user(),
						l2tp_passwd: self.ppp_pass(),
						goformId: 'set_xl2tp_config'
            }
		
				} else if (self.currentType() == 'PPTP') {
					params = {
						pptp_status: self.connect_status(),
						pptp_enable: self.enableL2TP() ? '1' : '0',
						pptp_server: self.lns_address(),
						pptp_name: self.host_name(),
						pptp_tunnel_pswd: self.tunnei_pass(),
						pptp_interval: self.handshake(),
						pptp_user: self.ppp_user(),
						pptp_passwd: self.ppp_pass(),
						pptp_auth_type: self.currentAuth(),
						goformId: 'set_pptp_config'
					}
				}
				var res = service.setVPNInfo(params);
				if (res.result === 'success') {
					successOverlay();
				} else {
					errorOverlay();
				}
			}
			
		}
		
	
		}
		
	
/**
     * 获取wifi休眠模式
     * @method getSleepInfo
     */
/*    function getL2TPMode() {
        return service.getL2TPMode();
    }*/
    /**
     * 初始化
     * @method init
     */
	function init() {
		var container = $('#container');
		ko.cleanNode(container[0]);
		var vm = new VPNVM();
		ko.applyBindings(vm, container[0]);
	
		$("#l2tpForm").validate({
			submitHandler: function(){
				vm.apply();
			}
        });
		
    }
    
    return {
        init: init
	}
});
