/**
 * PINT TEST设置模块
 * @module PING Test
 * @class PING Test
 */
define([ 'jquery', 'knockout', 'config/config', 'service', 'underscore' ],
function($, ko, config, service, _) {
    /**
     * PING TEST设置view model
     * @class PingTestViewModel
     */
	function PingTestViewModel(){
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
        self.SNTPSupport = config.HAS_SNTP;
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

		var data = service.getPingLog();
		
		self.enable = ko.observable(true);
		self.operate = ko.observable("");

		self.ping_ip_addr = ko.observable(""); 
		self.ping_count = ko.observable("10"); 		
		self.pingstatue = ko.observable(data.pingstatue);
		//self.haslog = ko.observable(data.haslog);
		self.ping_log_show = ko.observable("");	
		
		self.checkLogoInfo = function() {
			var data = service.getPingLog();
			self.pingstatue(data.pingstatue);
			
			if(data.pingstatue == "1" && self.operate() != "")
			{
				var ping_text = data.ping_log_show;
				ping_text = ping_text.replace(/\+/g, "\r\n");
				self.ping_log_show(ping_text);
				self.enable(false);
			}
		};
		
		self.checkLogoInfo();	
		
		/**
         * ping操作
         * @method pingstartoperate
         */
		self.pingstartoperate = function() {
			//AutoSelect call SetBearerPreference

			var ping_count = parseInt($("#pingcounttxt").val(), 10);
			var pin_count = Number($('#pingcounttxt').val());
			if (pin_count > 15 || pin_count < 1 || pin_count % 1 !== 0 || isNaN(pin_count)) {
				showAlert("ping_count_tip");
                return false;
            }
            // if (ping_count < 1) {
            //     showAlert("ping_count_positive_integer");
            //     return false;
            // }
			
    		var url = trim($('#pingipurl').val());
            if (url == "") {
                showAlert("IP or Url not null");
                return false;
            }
            clickStyle('btn_start_ping');
				
			var params = {};
			params.ping_ip_addr = self.ping_ip_addr();
			params.ping_count = self.ping_count();

			service.StartPing(params, function(result) {
				if (result.result == "success") {
					self.operate("start");
//					successOverlay();
				} else {
					errorOverlay();
        		    clickStyle('btn_stop_ping');
					self.operate("stop");
				}
			});
		};	

       /**
         * ping操作
         * @method pingstopoperate
         */
		self.pingstopoperate = function() {
			//AutoSelect call SetBearerPreference
			var params = {};
			
	          clickStyle('btn_stop_ping');
		
			service.StopPing(params, function(result) {
				if (result.result == "success") {
					self.operate("stop");
//					successOverlay();
				} else {
//					errorOverlay();
				}
			});
		};		   
}		
    function clickStyle(btn) {
        var flag = false;
        if (btn == "btn_start_ping") {
            $("#pinglog").text("");
            flag = true;
        }

        $("#btn_start_ping").attr("disabled", flag);
        $("#btn_stop_ping").attr("disabled", !flag);
        $("#pingcounttxt").attr("disabled", flag);
        $("#pingipurl").attr("disabled", flag);

        if (btn == 'btn_stop_ping') {
        }
    } 
    /**
     * 初始化
     * @method init
     */
	function init() {
		var container = $('#container');
		ko.cleanNode(container[0]);
		var vm = new PingTestViewModel();
		ko.applyBindings(vm, container[0]);
		
		addInterval(function (){vm.checkLogoInfo();}, 1000);
    }
    
    return {
        init: init
    };
});

