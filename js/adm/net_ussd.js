/**
 * setting--device seeting--USSD module
 * 
 * @module ussd
 * @class ussd
 */
define([ 'jquery', 'service', 'knockout','config/config'], function($, service, ko, config) {
	
	var initUSSD=true;
	var timeOutFlag=0;//计时
	var reply_flag=false;//是否已经得到回复
	var USSDLocation = {SEND:0, REPLY:1};
	var callbackTemp;
	var ussd_action=1;//初始化为成功获得返回消息
	var interval=0;

    /**
     * @class USSDInformationViewModel
     * @constructor
     */
	function USSDInformationViewModel() {
		var self = this;
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
		self.showvpn = ko.observable(service.showVPN().use_vpn_state === '1' ? true : false);
		self.sleepmode_display = ko.observable(service.getLanInfo().sleepmode_display==='yes');
		self.hasUpdateCheck = config.HAS_UPDATE_CHECK;
		self.ussd_action=ko.observable(ussd_action);
		self.USSDLocation=ko.observable(USSDLocation.SEND);
		self.USSDReply=ko.observable("");
		self.USSDSend=ko.observable("");
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
		self.hastr069 = ko.observable(config.HAS_TW_TR069);
		
		/**
		 * 发送USSD命令
		 * @method sendToNet
		 */
		self.sendToNet = function(){
			timeOutFlag=0;
			window.clearInterval(interval);
            var command = self.USSDSend();
			
	     var t_index = 0;
			var indexChar;
			for(t_index = 0;t_index < command.length;){//corem0418, delte left blanks and right blanks
				indexChar = command.charAt(t_index);
				if(indexChar == ' '){
					if(command.length > 1){
						command = command.substr(t_index + 1);
					}else{
						command ='';// string is filled with blank
						break;
					}
				}else{
					break;
				}
			}
			
			for(t_index = command.length - 1;t_index >= 0 && command.length > 0; --t_index){
				indexChar = command.charAt(t_index);
				if(indexChar == ' '){
					if(command.length > 1){
						command = command.substr(0, t_index);
					}else{
						command = '';// string is filled with blank
						break;
					}
				}else{
					break;
				}
			}

		 
            if (('string' != typeof (command)) || ('' == command)) {
                showAlert("ussd_error_input");
                return;
            }
			
            showLoading('waiting');	
			
            var params = {};
                params.operator = "ussd_send";
                params.strUSSDCommand = command;
                params.sendOrReply = "send";
			//发送
            service.getUSSDResponse(params, function(result, content){
                hideLoading();				
                if(result){
                    resetUSSD();
                    self.USSDLocation(USSDLocation.REPLY);
                    self.ussd_action(content.ussd_action);
                    $("#USSD_Content").val(decodeMessage(content.data, true));
                    reply_flag=false;
                    timeOutFlag=0;
                }else{
                    showAlert(content);
                }
            });
        };
		
        /**
         * 回复USSD消息
         * @method replyToNet
         */
        self.replyToNet = function(){
            timeOutFlag=0;
            window.clearInterval(interval);
            var command = self.USSDReply();

		var t_index = 0;
			var indexChar;
			for(t_index = 0;t_index < command.length;){//corem0418, delte left blanks and right blanks
				indexChar = command.charAt(t_index);
				if(!indexChar == ' '){
					if(command.length > 1){
						command = command.substr(t_index + 1);
					}else{
						break;
					}
				}else{
					break;
				}
			}
			
			for(t_index = command.length - 1;t_index >= 0 && command.length > 0; --t_index){
				indexChar = command.charAt(t_index);
				if(indexChar == ' '){
					if(command.length > 1){
						command = command.substr(0, t_index);
					}else{
						command = '';// string is filled with blank
						break;
					}
				}else{
					break;
				}
			}
			
            if (('string' != typeof (command)) || ('' == command)) {
				showAlert("ussd_error_input");
				return;
            }
			
            showLoading('waiting');	
			
            var params = {};
                params.operator = "ussd_reply";
                params.strUSSDCommand = command;
                params.sendOrReply = "reply";
			
            service.getUSSDResponse(params, function(result, content){
                hideLoading();
                if(result){
                    self.ussd_action(content.ussd_action);
                    $("#USSD_Content").val(decodeMessage(content.data, true));
                    reply_flag=false;
                    resetUSSD();
                    timeOutFlag=0;
                }else{
                    showAlert(content);
                }	
            });
        };
		
		/**
		 * 取消回复USSD消息
		 * @method noReplyCancel
		 */
		self.noReplyCancel = function(){
			timeOutFlag=0;
			reply_flag=true;
			window.clearInterval(interval);
			service.USSDReplyCancel(function(result){
				if(result){
					resetUSSD();
					self.USSDLocation(USSDLocation.SEND);
				}else{
					showAlert("ussd_fail");
				}
			});
		};
		
		/**
		 * 判断是否响应超时 reply_flag=true;
		 * @method timeOutVerify
		 */
		function timeOutVerify(){
			if(reply_flag){
				if(timeOutFlag<29){
					timeOutFlag++;
				}else{
					reply_flag=true;
					window.clearInterval(interval);
					showAlert("ussd_operation_timeout");
					self.USSDReply("");
					self.USSDSend("");
					self.USSDLocation(USSDLocation.SEND);
					timeOutFlag=0;
				}
			}else{
				reply_flag=true;
				window.clearInterval(interval);
				timeOutFlag=0;
			}
		};
		
		cancelUSSD = function(){
			service.USSDReplyCancel(function(result){
			});
		};
		
		/**
		 * 重置USSD输入命令
		 * @method resetUSSD
		 */
		resetUSSD = function(){
			self.USSDReply("");
			self.USSDSend("");
		};		
		
		// 如果首次进入USSD菜单，先发送USSD取消命令，进行初始化
		if(initUSSD){
			cancelUSSD();
			initUSSD=false;
		}
	}

    /**
     * 初始化
     * @method init
     */
	function init() {
		var container = $('#container')[0];
		ko.cleanNode(container);
		var vm = new USSDInformationViewModel();
		ko.applyBindings(vm, container);	
		
	}	
	
	return {
		init : init
	};
});
