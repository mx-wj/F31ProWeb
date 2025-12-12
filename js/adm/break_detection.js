define(['jquery', "service", 'underscore', 'config/config'], function ($, service, _, config) {

    function VM() {
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

        self.selects = _.map([
            {
                name: 'Enable',
                value: 'enable'
            },
            {
                name: 'Disable',
                value: 'disable'
            }
        ], function (item) {
            return new Option(item.name, item.value);
        })
        self.currentSelect = ko.observable();
        self.ip = ko.observable();
        self.ip1 = ko.observable();
        self.ip2 = ko.observable();
        self.ip3 = ko.observable();
        self.intervals = ko.observable();
        self.times = ko.observable();
        var data = service.getDetection();
        if (!data.errorType) {
            // 返回了正确的数据
            self.currentSelect(Number(data.net_selfcheck) ? 'enable' : 'disable');
            var arr = data.net_selfcheck_ip.split(';');
            self.ip1(arr[0]);
            self.ip2(arr[1]);
            self.ip3(arr[2]);
            self.intervals(data.net_selfcheck_interval);
            self.times(data.net_selfcheck_trytimes);
        }
        // 点击提交按触发事件
        self.apply = function () {
            var allRequired = true;         // 用一个变量来标识是否全部填写
            $('.required').each(function () {
                if ($(this).val() === '') {
                    $(this).focus();
                    allRequired = false;
                    return false;
                }
            })
            var trueIP = true;          //  IP地址是否全部填写正确, 出现字母时不进行校验
            $('.ipAddress').each(function () {
                // 匹配正确的ip地址或者域名
                var reg1 = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)|([a-zA-Z]+\.\w+\.\w+)$/;
                if (!reg1.test($(this).val())) {
                    trueIP = false;
                    $(this).focus();
                    // alert("请输入正确的ip地址或域名")
                    showAlert('trueIP')
                    return false;
                }
            })
            // 全部必填项都填写且IP地址校验成功才发送请求
            if (allRequired && trueIP) {
                var ip = '' + self.ip1() + ';' + self.ip2() + ';' + self.ip3();
                var params = {
                    net_selfcheck: self.currentSelect() === 'enable' ? '1' : '0',
                    net_selfcheck_ip: ip,
                    net_selfcheck_interval: self.intervals(),
                    net_selfcheck_trytimes: self.times()
                }
                service.setDetection(params, function (res) {
                    if (res.result === 'success') {
                        successOverlay();
                    } else {
                        errorOverlay();
                    }
                })
            }
        }
    }
    function init() {
        var container = $('#container');
        ko.cleanNode(container[0]);
        var vm = new VM();
        ko.applyBindings(vm, container[0]);
    }

    return {
        init: init
    }
});