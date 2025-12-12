/**
 * DDNS设置模块
 * @module DDNS
 * @class DDNS
 */
define([ 'jquery', 'knockout', 'config/config', 'service', 'underscore' ],
function($, ko, config, service, _) {
	var ddnsSetModes = _.map(config.DDNSSetMode, function(item) {
		return new Option(item.name, item.value);
	});

	var ddnsProviderList = _.map(config.DDNSDDP, function(item){
		return new Option(item.name, item.value);
	});

	var ddns_mode_select = _.map(config.ddns_Modeselect, function(item){
		return new Option(item.name, item.value);
	});
    /**
     * DDNS设置view model
     * @class ddnsViewModel
     */
	function DdnsViewModel(){
        var self = this;
		
        self.hasUssd = config.HAS_USSD;
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
		self.hasTelnetd = ko.observable(service.getLoginMode().login_mode);
		self.hastr069 = ko.observable(config.HAS_TW_TR069);
		
        var data = service.getDdnsParams();
        self.ddnsSetModes = ko.observableArray(ddnsSetModes);
        self.ddnsProviderList = ko.observableArray(ddnsProviderList);
        self.ddns_mode_select = ko.observableArray(ddns_mode_select);
        self.currentMode = ko.observable(data.DDNS_Enable);
        self.currentModeselect = ko.observable(data.DDNS_Mode);
        self.currentProviderList = ko.observable("dyndns.org");
        $.each(config.DDNSDDP,function(i,n){
            if(data.DDNSProvider==n.value){
                self.currentProviderList(data.DDNSProvider);
            }
        });
        self.DDNSaccount = ko.observable(data.DDNSAccount);
        self.DDNSpasswd = ko.observable(data.DDNSPassword);
        self.DDNSname = ko.observable(data.DDNS);
        self.DDNS_HashValue = ko.observable(data.DDNS_Hash_Value);
        self.isddnsStatusTrans = ko.observable();
			
        self.isEnableSet = ko.observable();
        self.isHashValue = ko.observable();
        self.isddnsaccount = ko.observable();
        self.isddnspasswd = ko.observable();
        self.isDDNSStatus = ko.observable();
        self.isddnsdomainName = ko.observable();
        self.isNone = ko.observable();
        self.onStates = ko.observable();

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

        self.showPassword_ddns = ko.observable(false);
        self.showPasswordHandler_ddns = function () {
            $("#ddns_passwd_input").parent().find(".error").hide();
            var checkbox = $("#showPassword_ddns:checked");
            if (checkbox && checkbox.length == 0) {
                self.showPassword_ddns(true);
            } else {
                self.showPassword_ddns(false);
            }
        };
        changeddnsProviderList();
        /**
         * 动态DNS服务器选项切换事件
         * @method changeDdnsProvider
         */		
        self.changeDdnsProvider = function(){
            if(data.DDNSProvider == self.currentProviderList()){
                self.DDNSaccount(data.DDNSAccount);
                self.DDNSpasswd(data.DDNSPassword);
                self.DDNSname(data.DDNS);
            }else{
                self.DDNSaccount("");
                self.DDNSpasswd("");
                self.DDNSname("");
            }
            changeddnsProviderList();
        };
        changeSetDdnsMode();
        self.changeSetDdnsMode = function(){
            changeSetDdnsMode();
        };
        updateScanStatus();

        /**
         * 提交
         * @method apply
         */
        self.apply = function() {
            showLoading();
            var params = {};
            params.goformId = "DDNS";
            params.DDNS_Enable = self.currentMode();
            if(self.currentMode() == "1") {
                params.DDNS_Mode = self.currentModeselect();
                params.DDNSProvider = self.currentProviderList();
                if(self.currentProviderList() != "none") {
                    params.DDNSAccount = self.DDNSaccount();
                    params.DDNSPassword = self.DDNSpasswd();
                    params.DDNS = self.DDNSname();
                }
                if(self.currentProviderList() == "freedns.afraid.org") {
                    params.DDNS_Hash_Value = self.DDNS_HashValue();
                }

            }

            service.setDDNSForward(params, function(result) {
                console.log(result)
                if (result.result == "success") {
                    successOverlay();
                    data = service.getDdnsParams();
                } else {
                    errorOverlay();
                }
            });			
        };
        /**
         * DDNS启用关闭切换事件
         * @method changeSetDdnsMode
         */
    function changeSetDdnsMode() {
        if(self.currentMode() == "1") {
            self.isEnableSet(true);
        } else {
            self.isEnableSet(false);
        }
        return true;
    }

   /**
	 * 实时刷新扫描状态
	 * @method updateScanStatus
	 */

    function updateScanStatus() {
        var trans = "";
        $.getJSON("/goform/goform_get_cmd_process", {
            cmd : "getddns_status",
            "_" : new Date().getTime()
        }, function(data) {
            if (data.getddns_status == "0") {
                trans = "register successful";
                self.onStates(true);
            }else if(data.getddns_status == "1"){
                trans = "login error";
                self.onStates(true);
            }else if(data.getddns_status == "2"){
                trans = "network error";
                self.onStates(true);
            }else if(data.getddns_status == "3"){
                trans = "registering";
                self.onStates(true);
            }else if(data.getddns_status == "4"){
                trans = "not registered";
                self.onStates(true);
            }else if(data.getddns_status == "5"){
                trans = "error registering";
                self.onStates(true);
            }else if(data.getddns_status == "-1"){
                trans = "";
                self.onStates(true);
            }
            self.isddnsStatusTrans($.i18n.prop(trans));	
            addTimeout(updateScanStatus, 2000);
        });
    }

    function changeddnsProviderList() {
        if(self.currentProviderList() == "none"){
                self.isddnsaccount(false);
                self.isddnspasswd(false);
                self.isddnsdomainName(false);
                self.isHashValue(false);
                self.isDDNSStatus(false);		
        } else{
                self.isddnsaccount(true);
                self.isddnspasswd(true);
                self.isddnsdomainName(true);
                self.isHashValue(true);
                self.isDDNSStatus(true);
        }
        if(self.currentProviderList() == "freedns.afraid.org"){
                self.isHashValue(true);
        } else {
                self.isHashValue(false);
        }
        return true;
    }
}
    /**
     * 初始化
     * @method init
     */
	function init() {
		var container = $('#container');
		ko.cleanNode(container[0]);
		var vm = new DdnsViewModel();
		ko.applyBindings(vm, container[0]);
	
		$("#ddnsForm").validate({
			submitHandler: function(){
				vm.apply();
			},
            rules: {
				ddns_passwd_input:"password_check",
				DDNS_Hash_Value:"ddns_hashvalue_check",
                ddns_passwd_inputshow:"password_check"
            },errorPlacement:function (error, element) {
                var id = element.attr("id");
                if (id == "ddns_passwd_input" ) {
                    error.insertAfter("#lblShowPassword");
                } else if (id == "ddns_passwd_inputshow" ){
                    error.insertAfter("#lblShowPassword");
                }else {
                    error.insertAfter(element);
                }
            }
        });
    }
    
    return {
        init: init
    };
});