/**
 * Router设置
 * @module lan
 * @class lan
 */
define(['jquery', 'knockout', 'config/config', 'service'],
    function ($, ko, config, service) {
        var DHCPSelection = _.map(config.DHCPSelection, function (item) {
            return new Option(item.name, item.value);
        });
        var originfrmLan = "";

        function LanVM() {
            var self = this;
            var info = getLanInfo();
            self.modes = ko.observableArray(DHCPSelection);
            self.ipAddress = ko.observable(info.ipAddress);
            self.subnetMask = ko.observable(info.subnetMask);
            self.macAddress = ko.observable(info.macAddress);
            self.sleepmode_display = ko.observable(info.sleepmode_display==='yes');
            self.dhcpServer = ko.observable(info.dhcpServer);
            self.dhcpStart = ko.observable(info.dhcpStart);
            self.dhcpEnd = ko.observable(info.dhcpEnd);
            self.dhcpLease = ko.observable(info.dhcpLease);
            self.showMacAddress = ko.observable(config.SHOW_MAC_ADDRESS);
            self.hasWifi = ko.observable(config.HAS_WIFI);
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
             * 界面状态刷新
             * @method refreshStatus
             */
            self.refreshStatus = function () {
                var connInfo = service.getConnectionInfo();
                if (connInfo.connectStatus == 'ppp_disconnected') {
                    $('input', '#frmLan').each(function () {
                        $(this).attr("disabled", false);
                    });
                } else {
                    $('input', '#frmLan').each(function () {
//                        $(this).attr("disabled", true);
                    });

                    clearValidateMsg();
                }
            };

            self.clear = function () {
                clearTimer();
                init();
                clearValidateMsg();
            };
            /**
             * 设置响应函数，进行设置保存
             * @method save
             */
            self.save = function () {
                var frmLanObj = $('#frmLan').serialize();
                if (frmLanObj == originfrmLan) {
                    showAlert("setting_no_change");
                    return false;
                }
                if (config.RJ45_SUPPORT) {
                    var pppObj = service.getPppoeParams();
                    if (isStaticIPValid(pppObj.static_wan_ipaddr, self.ipAddress(), self.subnetMask())) {
                        showAlert("lan_tip_staticip_notsame");
                        return false;
                    }
                }
                showConfirm("lan_confirm_reopen", function () {
                    self.saveAct();
                });
            };

            self.saveAct = function () {
                showLoading();
                var params = {
                    ipAddress: self.ipAddress(),
                    subnetMask: self.subnetMask(),
                    dhcpServer: self.dhcpServer(),
                    dhcpStart: self.dhcpStart(),
                    dhcpEnd: self.dhcpEnd(),
                    dhcpLease: self.dhcpLease()
                };
                service.setLanInfo(params, function (result) {
                    if (result.result == "success") {
                        successOverlay();
                        self.clear();
                    } else {
                        errorOverlay();
                    }
                });
            };

            self.refreshStatus();
            /**
             * dhcpServer切换响应函数
             * @method dhcpServerHandler
             */
            self.dhcpServerHandler = function () {
                $("#txtIpAddress").parent().find(".error").hide();
                $("#txtIpAddress").show();
                if (self.dhcpServer() != "1") {
                    showAlert("dhcp_select");
                }
                return true;
            };
            addTimeout(function () {
                originfrmLan = $('#frmLan').serialize();
            }, 500);
        }

        /**
         * 获取路由设置相关信息
         * @method getLanInfo
         */
        function getLanInfo() {
            return service.getLanInfo();
        }

        /**
         * 初始化
         * @method init
         */
        function init() {
            var container = $('#container');
            ko.cleanNode(container[0]);
            var vm = new LanVM();
            ko.applyBindings(vm, container[0]);

            addInterval(vm.refreshStatus, 1000);

            $('#frmLan').validate({
                submitHandler: function () {
                    vm.save();
                },
                rules: {
                    txtIpAddress: {
                        lanip_check: true,
                        ipRange: true
                    },
                    txtSubnetMask: {
                        ipv4: true,
                        subnetmask_check: true
                    },
                    txtDhcpIpPoolStart: {
                        lanip_check: true,
                        dhcp_check: "start",
                        dhcpCompare: "#txtDhcpIpPoolEnd"
                    },
                    txtDhcpIpPoolEnd: {
                        lanip_check: true,
                        dhcp_check: "end",
                        dhcpCompare: "#txtDhcpIpPoolStart"
                    },
                    txtDhcpLease: {
                        range: [1, 65535],
                        digits: true
                    }
                },
                groups: {
                    lanip_check: "txtDhcpIpPoolStart txtDhcpIpPoolEnd"
                },
                errorPlacement: function (error, element) {
                    if (element.attr("name") == "txtDhcpIpPoolStart") {
                        error.insertAfter("#txtDhcpIpPoolEnd");
                    } else if (element.attr("name") == "txtDhcpLease") {
                        error.insertAfter("#errorHolder");
                    } else
                        error.insertAfter(element);
                }
            });

        }

        /* 界面相关表单校验规则*/
        $.validator.addMethod("subnetmask_check", function (value, element, param) {
            var result = validateNetmask(value);
            return this.optional(element) || result;
        });

        $.validator.addMethod("dhcp_check", function (value, element, param) {
            var dhcpIp = param == "start" ? $('#txtDhcpIpPoolStart').val() : $('#txtDhcpIpPoolEnd').val();
            var result = validateGateway($('#txtIpAddress').val(), $('#txtSubnetMask').val(), dhcpIp);
            return this.optional(element) || result;
        });

        $.validator.addMethod("dhcpCompare", function (value, element, param) {
            var result;
            if (param == "#txtDhcpIpPoolStart") {
                result = validateStartEndIp($('#txtIpAddress').val(), $('#txtSubnetMask').val(), $(param).val(), value);
            } else {
                result = validateStartEndIp($('#txtIpAddress').val(), $('#txtSubnetMask').val(), value, $(param).val());
            }
            return result != 1;
        });

        $.validator.addMethod("ipRange", function (value, element, param) {
            var DHCP_flag = false;
            if ($('#dhcpEnable').is(':checked')) {
                DHCP_flag = true;
            }
            var result = validateStartEndIp(value, $('#txtSubnetMask').val(), $('#txtDhcpIpPoolStart').val(), $('#txtDhcpIpPoolEnd').val(), DHCP_flag);
            return result != 2;
        });

        /**
         * 静态有效IP校验函数
         * @method isStaticIPValid
         */
        function isStaticIPValid(ip, lanip, lanmask) {
            if (!ip || !lanip || !lanmask) {//各参数不能为空
                return false;
            }
            if (ip == lanip) {// 与内网IP相等
                return true;
            }
            var res1 = [], res2 = [], mask = [];
            addr1 = ip.split(".");
            addr2 = lanip.split(".");
            mask = lanmask.split(".");
            for (var i = 0; i < addr1.length; i += 1) {
                res1.push(parseInt(addr1[i]) & parseInt(mask[i]));
                res2.push(parseInt(addr2[i]) & parseInt(mask[i]));
            }
            if (res1.join(".") == res2.join(".")) {//在同一个网段
                return true;
            } else {//不在同一个网段
                return false;
            }
        }

        /**
         * 子网掩码校验函数
         * @method validateNetmask
         */
        function validateNetmask(netmask) {
            var array = netmask.split(".");

            if (array.length != 4) {
                return false;
            }

            array[0] = parseInt(array[0]);
            array[1] = parseInt(array[1]);
            array[2] = parseInt(array[2]);
            array[3] = parseInt(array[3]);

            if (array[3] != 0) {
                if (array[2] != 255 || array[1] != 255 || array[0] != 255) {
                    return false;
                } else {
                    if (!isNetmaskIPValid(array[3])) {
                        return false;
                    }
                }
            }

            if (array[2] != 0) {
                if (array[1] != 255 || array[0] != 255) {
                    return false;
                } else {
                    if (!isNetmaskIPValid(array[2])) {
                        return false;
                    }
                }
            }

            if (array[1] != 0) {
                if (array[0] != 255) {
                    return false;
                } else {
                    if (!isNetmaskIPValid(array[1])) {
                        return false;
                    }
                }
            }
            if (array[0] != 255) {
                return false;
            }
            if ("0.0.0.0" == netmask || "255.255.255.255" == netmask) {
                return false;
            }

            return true;
        }

        function isNetmaskIPValid(ip) {
            return (ip == 255 || ip == 254 || ip == 252 || ip == 248
                || ip == 240 || ip == 224 || ip == 192 || ip == 128 || ip == 0);
        }

        /**
         * 网关校验函数
         * @method validateGateway
         */
        function validateGateway(wanIp, netmaskIp, gatewayIp) {
            var i1, i2, i3, wip, nip, gip;
            var lan4, mask4, pool4, net_no, lo_broadcast;

            i1 = wanIp.indexOf('.');
            i2 = wanIp.indexOf('.', (i1 + 1));
            i3 = wanIp.indexOf('.', (i2 + 1));
            wip = hex(wanIp.substring(0, i1)) + hex(wanIp.substring((i1 + 1), i2)) + hex(wanIp.substring((i2 + 1), i3)) + hex(wanIp.substring((i3 + 1), wanIp.length));
            wip = '0x' + wip;
            lan4 = wanIp.substring((i3 + 1), wanIp.length) - 0;

            i1 = netmaskIp.indexOf('.');
            i2 = netmaskIp.indexOf('.', (i1 + 1));
            i3 = netmaskIp.indexOf('.', (i2 + 1));
            nip = hex(netmaskIp.substring(0, i1)) + hex(netmaskIp.substring((i1 + 1), i2)) + hex(netmaskIp.substring((i2 + 1), i3)) + hex(netmaskIp.substring((i3 + 1), netmaskIp.length));
            nip = '0x' + nip;
            mask4 = netmaskIp.substring((i3 + 1), netmaskIp.length) - 0;

            i1 = gatewayIp.indexOf('.');
            i2 = gatewayIp.indexOf('.', (i1 + 1));
            i3 = gatewayIp.indexOf('.', (i2 + 1));
            gip = hex(gatewayIp.substring(0, i1)) + hex(gatewayIp.substring((i1 + 1), i2)) + hex(gatewayIp.substring((i2 + 1), i3)) + hex(gatewayIp.substring((i3 + 1), gatewayIp.length));
            gip = '0x' + gip;
            pool4 = gatewayIp.substring((i3 + 1), gatewayIp.length) - 0;

            if (Op_AND_4Byte(wip, nip) != Op_AND_4Byte(gip, nip)) {
                return false;
            }

            net_no = (lan4 & mask4);
            lo_broadcast = (lan4 & mask4) + (255 - mask4);

            return !(pool4 == net_no || pool4 == lo_broadcast);
        }

        function hex(val) {
            var h = (val - 0).toString(16);
            if (h.length == 1) h = '0' + h;
            return h.toUpperCase();
        }

        function Op_AND_4Byte(v1, v2) {
            var i;
            var var1 = [];
            var var2 = [];
            var result = '0x';

            for (i = 2, j = 0; i < 10; i += 2, j++) {
                var1[j] = '0x' + v1.substring(i, i + 2);
                var2[j] = '0x' + v2.substring(i, i + 2);
            }

            for (i = 0; i < 4; i++) {
                result = result + hex(var1[i] & var2[i]);
            }

            return result - 0;
        }

        /**
         * DHCP IP池校验函数
         * @method validateStartEndIp
         */
        function validateStartEndIp(lan_ipaddr, netip, startip, endip, DHCP_flag) {
            i1 = startip.indexOf('.');
            i2 = startip.indexOf('.', (i1 + 1));
            i3 = startip.indexOf('.', (i2 + 1));
            sip = hex(startip.substring(0, i1)) + hex(startip.substring((i1 + 1), i2)) + hex(startip.substring((i2 + 1), i3)) + hex(startip.substring((i3 + 1), startip.length));
            sip = '0x' + sip;

            i1 = endip.indexOf('.');
            i2 = endip.indexOf('.', (i1 + 1));
            i3 = endip.indexOf('.', (i2 + 1));
            eip = hex(endip.substring(0, i1)) + hex(endip.substring((i1 + 1), i2)) + hex(endip.substring((i2 + 1), i3)) + hex(endip.substring((i3 + 1), endip.length));
            eip = '0x' + eip;

            i1 = lan_ipaddr.indexOf('.');
            i2 = lan_ipaddr.indexOf('.', (i1 + 1));
            i3 = lan_ipaddr.indexOf('.', (i2 + 1));

            var compLanIp = '0x' + hex(lan_ipaddr.substring(0, i1)) + hex(lan_ipaddr.substring((i1 + 1), i2)) + hex(lan_ipaddr.substring((i2 + 1), i3)) + hex(parseInt(lan_ipaddr.substring((i3 + 1), lan_ipaddr.length)) + 18);
            lan_ipaddr = hex(lan_ipaddr.substring(0, i1)) + hex(lan_ipaddr.substring((i1 + 1), i2)) + hex(lan_ipaddr.substring((i2 + 1), i3)) + hex(lan_ipaddr.substring((i3 + 1), lan_ipaddr.length));
            lan_ipaddr = '0x' + lan_ipaddr;

            if (sip > eip) {
                return 1;
            }

            if (lan_ipaddr >= sip && lan_ipaddr <= eip) {
                return 2;
            }

            return 0;
        }

        return {
            init: init
        }
    }
);
