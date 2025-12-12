/**
 * home 模块
 * @module home
 * @class home
 */

define(['knockout', 'service', 'jquery', 'config/config', 'underscore', 'status/statusBar', 'echarts'],
    function (ko, service, $, config, _, statusBar, echarts) {
        var CONNECT_STATUS = {CONNECTED: 1, DISCONNECTED: 2, CONNECTING: 3, DISCONNECTING: 4};
		var CURRENT_MODE = {WIRELESS: 1, CABLE: 2, AUTO: 3};
        var myChart = null;
        var refreshCount = 0;
		var originalLan = window.language;
    /**
     * 流量图基本配置，具体可查看echarts官方接口文档
     * @object chartOptions
     */	
        var chartOptions = {
			tooltip: {
                formatter: "{b}"
            },
            title: {
                text: '',
                x: 'center',
                y: 'center',
                itemGap: 0,
                textStyle: {
                    color: '#FFF',
                    fontFamily: '微软雅黑',
                    fontSize: 20,
                    fontWeight: 'bolder'
                },
                subtextStyle: {
                    color: '#FFF',
                    fontFamily: '微软雅黑',
                    fontSize: 16,
                    fontWeight: 'bolder'
                }
            },
            animation: false,
            series: [
                {
                    name: '流量控制',
                    type: 'pie',
                    radius: ['0', '72'],
                    itemStyle: {
                        normal: {
                            label: {
                                show: false
                            },
                            labelLine: {
                                show: false
                            }
                        }
                    },
                    data: [

                    ],
                    selectedOffset: 3
                }
            ],
            color: ['red', 'red', 'red', 'red', 'red']
        };

        /**
         * HomeViewMode
         * @class HomeViewMode
         */
        function HomeViewMode() {
            var self = this;
            var wifiInfo = service.getWifiBasic();
            config.HAS_SMS = wifiInfo.need_support_sms==='yes';
            config.HAS_PHONEBOOK = wifiInfo.need_support_pb==='yes';
            config.HAS_BATTERY = wifiInfo.has_battery==='yes';
            self.network_display = wifiInfo.network_display==='yes';
            self.sleepmode_display = wifiInfo.sleepmode_display==='yes';
            if (wifiInfo.user_web_hide_wifi == 1) {
                config.HAS_WIFI =  false ;
            }
            else{
                config.HAS_WIFI =  true ;
                
            };
            self.hide_band = ko.observable(wifiInfo.hide_band);
            self.sn = ko.observable(wifiInfo.sn_boardnum ? wifiInfo.sn_boardnum : '--' );
            self.sn_display = ko.observable(wifiInfo.hide_sn != '1');
            self.hide_wfrcn_pci = ko.observable(wifiInfo.hide_wfrcn_pci);
            self.user_web_disp_privacy_statement = ko.observable(wifiInfo.user_web_disp_privacy_statement);
            self.user_web_disp_opensource_statement = ko.observable(wifiInfo.user_web_disp_opensource_statement);
            self.hide_wifi_password = ko.observable();
            if (wifiInfo.hide_wifi_password == '1' || wifiInfo.user_web_hide_wifi == 1 ||wifiInfo.user_web_hide_wifi == "1") {
                self.hide_wifi_password(false)
            }else{
                
                self.hide_wifi_password(true)
            }
            self.hasSms = config.HAS_SMS;
            self.hasPhonebook = config.HAS_PHONEBOOK;
            self.hide_web_fota_all = wifiInfo.hide_web_fota_all
            self.hasUpgrade = wifiInfo.hide_web_fota != '1';
            self.hasUpgrade1 = wifiInfo.hide_web_fota == '1';
            self.isSupportSD = config.SD_CARD_SUPPORT;
            self.isCPE = config.PRODUCT_TYPE == 'CPE';
            self.hasRj45 = config.RJ45_SUPPORT;
            self.notDataCard = config.PRODUCT_TYPE != 'DATACARD';
			self.hasParentalControl = config.HAS_PARENTAL_CONTROL;
			self.hasSystermStatue = config.HAS_SYSTERM_STATUE;
			self.hasNetworkSettings =  config.HAS_NETWORK_SETTINGS;
            self.dtu_need_display = ko.observable(service.dtuDisplay().dtu_need_display);
            config.HAS_MULTI_SSID = wifiInfo.disable_m_ssid!=="yes";
            config.AP_STATION_SUPPORT = wifiInfo.wifi_sta_need_display==="yes";
            self.disable_traffic_manager = wifiInfo.disable_traffic_manager!="yes";

			if(config.WIFI_SUPPORT_QR_SWITCH){
				self.showQRCode = config.WIFI_SUPPORT_QR_CODE && wifiInfo.show_qrcode_flag;
			}else{
				self.showQRCode = config.WIFI_SUPPORT_QR_CODE;
			}            
            self.qrcodeSrc = './img/qrcode_ssid_wifikey.png?_=' + $.now();			
			
            if(self.hasRj45){
                var opModeObj = checkCableMode(service.getOpMode().blc_wan_mode);
                self.opCurMode = ko.observable(opModeObj);
                self.isShowHomeConnect = ko.observable(!opModeObj);
                self.showTraffic = ko.observable(config.TRAFFIC_SUPPORT && !opModeObj);
                self.isSupportQuicksetting = ko.observable(config.HAS_QUICK_SETTING && !opModeObj);//wifi APN 是否支持有关
            } else {
                self.isShowHomeConnect = ko.observable(true);
                self.showTraffic = ko.observable(config.TRAFFIC_SUPPORT);
                self.isSupportQuicksetting = ko.observable(config.HAS_QUICK_SETTING);
            }
            if(config.PRODUCT_TYPE == 'DATACARD') {
                $('#home_image').addClass('data-card');
            }

            var info = service.getConnectionInfo();
            self.networkType = ko.observable(homeUtil.getNetworkType(info.networkType));
            self.connectStatus = ko.observable(info.connectStatus);
            self.canConnect = ko.observable(false);
            self.cStatus = ko.computed(function () {
                if (self.connectStatus().indexOf('_connected') != -1) {
                    return CONNECT_STATUS.CONNECTED;
                } else if (self.connectStatus().indexOf('_disconnecting') != -1) {
                    return CONNECT_STATUS.DISCONNECTING;
                } else if (self.connectStatus().indexOf('_connecting') != -1) {
                    return CONNECT_STATUS.CONNECTING;
                } else {
                    return CONNECT_STATUS.DISCONNECTED;
                }
            });

            self.current_Flux = ko.observable(transUnit(0, false));
            self.connected_Time = ko.observable(transSecond2Time(0));
            self.up_Speed = ko.observable(transUnit(0, true));
            self.down_Speed = ko.observable(transUnit(0, true));

            self.isLoggedIn = ko.observable(false);
            self.enableFlag = ko.observable(true);

            self.simSerialNumber = ko.observable('');
            self.product_model_prefix = ko.observable('');
            self.sim_ICCID = ko.observable('');
            self.WiFiPassword = ko.observable('');
            self.WiFiCoverageArea = ko.observable('');
            self.WLAN_MAC = ko.observable('WLAN_MAC');
            self.WLAN_IPAddress = ko.observable('WLAN_IPAddress');
            self.LAN_IPAddress = ko.observable('LAN_IPAddress');
            self.imei = ko.observable('');
            self.imsi = ko.observable('');
			self.CurrentBand = ko.observable("--");	
			self.wfrcn_pci = ko.observable("-/-");
            self.creg_stat = ko.observable('');
            self.cereg_stat = ko.observable('');
			
            self.ssid = ko.observable('');
            self.hasWifi = config.HAS_WIFI;
            self.showMultiSsid = ko.observable(config.HAS_MULTI_SSID && wifiInfo.multi_ssid_enable == "1");
            self.hide_sim_iccid = ko.observable(wifiInfo.hide_sim_iccid != "1");
            self.display_model = ko.observable(wifiInfo.display_model == "1");
            self.cellid_hide = ko.observable(wifiInfo.cellid_hide != "1");

            self.trafficAlertEnable = ko.observable(false);
            self.trafficUsed = ko.observable('');
            self.trafficLimited = ko.observable('');

            self.wireDeviceNum = ko.observable(service.getAttachedCableDevices().attachedDevices.length);
            self.wirelessDeviceNum = ko.observable(service.getStatusInfo().wirelessDeviceNum);

            self.showOpModeWindow = function () {
				if(self.enableFlag()){
					return;
				}
                showSettingWindow("change_mode", "opmode/opmode_popup", "opmode/opmode_popup", 400, 300, function () {
                });
            };
            self.currentOpMode = ko.observable("0");
            self.network_type = ko.observable('--');
            /**
             * 设备信息显示popover初始化和事件绑定
             * @object $('#showDetailInfo')
             */			
            var popoverShown = false;
            $('#showDetailInfo').popover({
                html: true,
                placement: 'top',
                trigger: 'focus',
                title: function () {
                    return $.i18n.prop('device_info')
                },
                content: function () {
                    return getDetailInfoContent();
                }
            }).on('shown.bs.popover', function () {
                popoverShown = true;
            }).on('hidden.bs.popover', function () {
                popoverShown = false;
            });
            /**
             * 获取设备信息显示相关信息
             * @method fetchDeviceInfo
             */
			self.user_web_disp_rssi_3g_4g = ko.observable(); //add 20240603
            function fetchDeviceInfo() {
                var data = service.getDeviceInfo();
                self.simSerialNumber(verifyDeviceInfo(data.simSerialNumber));
                self.product_model_prefix(data.product_model_prefix)
                self.imei(verifyDeviceInfo(data.imei));
                self.imsi(verifyDeviceInfo(data.imsi));
                self.ssid(verifyDeviceInfo(data.ssid));
                self.WiFiPassword(data.passPhrase);
                //self.WiFiCoverageArea($.i18n.prop("wifi_des_" + data.wifiRange));
                /*modify 20210904 通过此方式修复切换语言时，无法及时更新的文本显示的问题。*/
                self.WiFiCoverageArea=(("wifi_des_" + data.wifiRange));
                $("#id_WiFiCoverageArea").attr("data-trans", self.WiFiCoverageArea).text($.i18n.prop(self.WiFiCoverageArea));

                self.showMultiSsid(config.HAS_MULTI_SSID && data.multi_ssid_enable == "1");
                self.hide_sim_iccid = (data.hide_sim_iccid != "1");
                self.display_model = (data.display_model == "1");
                self.cellid_hide = (data.cellid_hide != "1");

                var info2 = service.getNetworkStatue();
				self.network_type(info2.network_type);
				self.user_web_disp_rssi_3g_4g(info2.user_web_disp_rssi_3g_4g); //add 20240603
				if (self.network_type() == "LTE" || self.network_type() == "16") //LTE  //modify by lzj, was 16
				{
					//data.nv_rsrp; //不覆盖，按原样显示。
					if (self.user_web_disp_rssi_3g_4g() == 1){
						data.nv_rssi=tw_rssi_format(info2.nv_rsrp);
					}
					else{
						data.nv_rssi=("--");
					}
				}
				else if (self.network_type() == 1 || self.network_type() == 2  || self.network_type() != "WCDMA" )//3g
				{
					//data.nv_rsrp; //不覆盖，按原样显示。
					if (self.user_web_disp_rssi_3g_4g() == 1){
						data.nv_rssi=tw_rssi_format(info2.nv_rsrp);
					}
					else{
						data.nv_rssi=("--");
					}
					
				}
				else if (self.network_type() == 4 || self.network_type() == 'GSM')//2g
				{
                    data.nv_rsrp=("--");
					if (self.user_web_disp_rssi_3g_4g() == 1){
						data.nv_rssi=tw_rssi_format(info2.nv_rsrp);
					}
					else{
						//data.rssi; //不覆盖，按原样显示。
					}
				}
				else {
                    data.nv_rsrp=("--");
					data.nv_rssi=("--");
				}
                //SIM卡状态不准备好的情况下，显示空。
                if(info2.cpin!='READY')
                {
                    data.imsi=("--");
                    data.ziccid=("--");
                }
                //非注网的时候，数据显示--
                if (self.network_type() != "LTE" && self.network_type() != "16" && self.network_type() != 1 && self.network_type() != 2 && self.network_type() != 4 && self.network_type() != "WCDMA" && self.network_type() != "GSM")  //LTE(4G),1/2(3G),4(2G)
                {
                    data.nv_band=("--");
                    data.nv_arfcn=("--");
                    data.nv_pci=("--");
                    data.cell_id=("--");
                    data.nv_cqi=("--");
                    data.nv_snr=("--");
                    data.nv_enodbid=("--");
                } 
    
                return data;
            }

            fetchDeviceInfo();

			
            function getDetailInfoContent() {
                var data = fetchDeviceInfo();
                homeUtil.initShownStatus(data);
                var addrInfo = homeUtil.getWanIpAddr(data);
                var compiled = _.template($("#detailInfoTmpl").html());
                var tmpl = compiled({
                    WiFiPassword: data.passPhrase,
                    Cell_ID: data.cell_id,
                    CQI: data.nv_cqi,
                    RSRQ: self.network_type() == 'LTE' || self.network_type() == '16' ? rsrq_format(data.nv_rsrq) : "--",
                    RSRP: self.network_type() == 'LTE' || self.network_type() == '16' ? rsrp_format(data.nv_rsrp) : rsrp_format(data.nv_rscp) ,
                    RSSI: data.nv_rssi,
                    SNR: data.nv_snr,
                    sn: data.sn_boardnum ? data.sn_boardnum : '--' ,
                    sn_display: data.hide_sn != '1',
                    eNodeB_ID: data.nv_enodbid,
                    PCI: data.nv_pci,
                    frequencyBand: data.nv_band,
                    frequencyPoint: data.nv_arfcn,
                    simSerialNumber: verifyDeviceInfo(data.simSerialNumber),
                    product_model_prefix: data.product_model_prefix,
                    sim_ICCID: data.ziccid,
                    WLAN_MAC: data.wifi_mac,
                    WLAN_IPAddress: data.wanIpAddress?data.wanIpAddress:'--',
                    LAN_IPAddress: data.ipAddress,
                    imei: verifyDeviceInfo(data.imei),
                    imsi: verifyDeviceInfo(data.imsi),
                    signal: signalFormat(data.signal),
                    hasWifi: config.HAS_WIFI,
                    isCPE: config.PRODUCT_TYPE == 'CPE',
                    hasRj45: config.RJ45_SUPPORT,
                    showMultiSsid: config.HAS_MULTI_SSID && data.multi_ssid_enable == "1",
                    hide_sim_iccid : data.hide_sim_iccid != "1",
                    display_model : data.display_model == "1",
                    cellid_hide : data.cellid_hide != "1",
                    sleepmode_display: self.sleepmode_display,
                    ssid: verifyDeviceInfo(data.ssid),
                    max_access_num: verifyDeviceInfo(data.max_access_num),
                    m_ssid: verifyDeviceInfo(data.m_ssid),
                    m_max_access_num: verifyDeviceInfo(data.m_max_access_num),
                    wifi_long_mode: "wifi_des_" + data.wifiRange,
                    lanDomain: verifyDeviceInfo(data.lanDomain),
                    ipAddress: verifyDeviceInfo(data.ipAddress),
                    showMacAddress: config.SHOW_MAC_ADDRESS,
                    macAddress: verifyDeviceInfo(data.macAddress),
                    showIpv4WanIpAddr: homeUtil.initStatus.showIpv4WanIpAddr,
                    wanIpAddress: addrInfo.wanIpAddress,
                    showIpv6WanIpAddr: homeUtil.initStatus.showIpv6WanIpAddr,
                    ipv6WanIpAddress: addrInfo.ipv6WanIpAddress,
                    sw_version: verifyDeviceInfo(data.sw_version),
                    hw_version: verifyDeviceInfo(data.hw_version),
                    web_version: data.web_version
                });
                // console.log({
                //     simSerialNumber: verifyDeviceInfo(data.simSerialNumber),
                //     imei: verifyDeviceInfo(data.imei),
                //     imsi: verifyDeviceInfo(data.imsi),
                //     signal: signalFormat(data.signal),
                //     hasWifi: config.HAS_WIFI,
                //     isCPE: config.PRODUCT_TYPE == 'CPE',
                //     hasRj45: config.RJ45_SUPPORT,
                //     showMultiSsid: config.HAS_MULTI_SSID && data.multi_ssid_enable == "1",
                //     ssid: verifyDeviceInfo(data.ssid),
                //     max_access_num: verifyDeviceInfo(data.max_access_num),
                //     m_ssid: verifyDeviceInfo(data.m_ssid),
                //     m_max_access_num: verifyDeviceInfo(data.m_max_access_num),
                //     wifi_long_mode: "wifi_des_" + data.wifiRange,
                //     lanDomain: verifyDeviceInfo(data.lanDomain),
                //     ipAddress: verifyDeviceInfo(data.ipAddress),
                //     showMacAddress: config.SHOW_MAC_ADDRESS,
                //     macAddress: verifyDeviceInfo(data.macAddress),
                //     showIpv4WanIpAddr: homeUtil.initStatus.showIpv4WanIpAddr,
                //     wanIpAddress: addrInfo.wanIpAddress,
                //     showIpv6WanIpAddr: homeUtil.initStatus.showIpv6WanIpAddr,
                //     ipv6WanIpAddress: addrInfo.ipv6WanIpAddress,
                //     sw_version: verifyDeviceInfo(data.sw_version),
                //     hw_version: verifyDeviceInfo(data.hw_version)
                // })
                return  $(tmpl).translate();
            }

            /**
             * 连结按钮事件
             * @method connectHandler
             */	
            self.connectHandler = function () {
                if (self.connectStatus() == "ppp_connected") {
                    showLoading('disconnecting');
                    service.disconnect({}, function (data) {
                        if (data.result) {
                            successOverlay();
                        } else {
                            errorOverlay();
                        }
                    });
                } else {
                    if (service.getStatusInfo().roamingStatus) {
                        showConfirm('dial_roaming_connect', function () {
                            self.connect();
                        });

                    } else {
                        self.connect();
                    }
                }
            };

            self.connect = function () {
                var statusInfo = service.getStatusInfo();
                var trafficResult = statusBar.getTrafficResult(statusInfo);
                if (statusInfo.limitVolumeEnable && trafficResult.showConfirm) {
                    var confirmMsg = null;
                    if (trafficResult.usedPercent > 100) {
                        confirmMsg = {msg: 'traffic_beyond_connect_msg'};
                        statusBar.setTrafficAlertPopuped(true);
                    } else {
                        confirmMsg = {msg: 'traffic_limit_connect_msg', params: [trafficResult.limitPercent]};
                        statusBar.setTrafficAlert100Popuped(false);
                    }
                    showConfirm(confirmMsg, function () {
                        homeUtil.doConnect();
                    });
                } else {
                    homeUtil.doConnect();
                }
            };

			service.getSignalStrength({}, function (data) {
                var signalTxt = signalFormat(convertSignal(data));
                $("#fresh_signal_strength").text(signalTxt);
                if (popoverShown) {
                    $("#popoverSignalTxt").text(signalTxt);
                }
            });
            
            homeUtil.refreshHomeData(self);
            addInterval(function () {
                service.getSignalStrength({}, function (data) {
                    var signalTxt = signalFormat(convertSignal(data));
                    $("#fresh_signal_strength").text(signalTxt);
                    if (popoverShown) {
                        $("#popoverSignalTxt").text(signalTxt);
                    }
                });
                homeUtil.refreshHomeData(self);
            }, 1000);
			
            if (self.hasRj45) {	
                homeUtil.refreshOpmodeInfo(self);			
                addInterval(function () {
                    homeUtil.refreshOpmodeInfo(self);
                }, 1000);
            }

            /**
             * 显示模式设置窗口
             * @method showNetworkSettingsWindow
             */				
            self.showNetworkSettingsWindow = function () {
                if (self.hasRj45) {
                    service.getOpMode({}, function (data) {
                        var mode = checkCableMode(data.blc_wan_mode);
                        if(mode){
                            window.location.hash = '#net_setting';
                        } else{
                            window.location.hash = '#dial_setting';
                        }
                    });	
                }else{
                    window.location.hash = '#dial_setting';
                }                			
            };	

			self.FreshParam = function(){
				var data = service.getNetworkStatue()
				if(data.errorId == "123"){
					self.CurrentBand("--");	
					self.wfrcn_pci("-/-");
				}
				else{	
					
					if(data.creg_stat == "1" || data.cereg_stat ==  "1" || data.creg_stat == "5" || data.cereg_stat ==  "5")
					{
							self.CurrentBand(band_format(data.nv_band));	
							self.wfrcn_pci(wfrcn_pci_fomart(data.nv_arfcn,data.nv_pci));
					}
					else
					{
						self.CurrentBand("--");	
						self.wfrcn_pci("-/-");		
					}
				}	
			};	
			self.FreshParam();
            //判断是否开启机卡互锁功能
            if(config.CONFIG_USE_TW_MACH_SIM_LOCK){
            /*检查当前机卡互锁的异常状态，并弹框提示*/
            self.GETDATA = function () {
                let mach_sim_lock_status = service.mach_sim_lock_statusfunc().mach_sim_lock_status
                let mach_sim_lock  = service.mach_sim_lock_statusfunc().mach_sim_lock 
            let debug_enable  = service.mach_sim_lock_statusfunc().debug_enable
                let MACH_SIM_LOCK_type=""
                let SIM_LOCK_type = ""
                let SIM_LOCK_type_msg = ""
                let Show_Msg = ""
        
            //判断是用户模式下才执行该操作。0用户模式，1研发模式。
            if(debug_enable == 0){
                if (mach_sim_lock_status == 2 ||mach_sim_lock_status == 3) {
                    // 已绑定
                    SIM_LOCK_type='SIM卡正常'
                } else if (mach_sim_lock_status == -4) {
                    // SIM卡不匹配
                    SIM_LOCK_type='SIM卡不匹配'
                } else if (mach_sim_lock_status == -9) {
                    // /PIN码不正确
                    SIM_LOCK_type='PIN码不正确'
                } else if (mach_sim_lock_status == -1) {
                    // /SIM卡未插入
                    SIM_LOCK_type='SIM卡未插入'
                }else if (mach_sim_lock_status == 5) {
                    // /SIM卡未插入
                    SIM_LOCK_type='已解锁'
                }else if (mach_sim_lock_status == 4) {
                    // /SIM卡未插入
                    SIM_LOCK_type='正在解锁'
                }else{
                    // /SIM状态异常
                    SIM_LOCK_type='SIM状态异常'
                }
                
                if (mach_sim_lock  == 1) {
                    // 已绑定
                    MACH_SIM_LOCK_type = "机卡互锁状态: 已绑定"
                    SIM_LOCK_type_msg = "当前卡状态: "+SIM_LOCK_type
                    Show_Msg = MACH_SIM_LOCK_type+"<br><br>"+SIM_LOCK_type_msg
                    if (mach_sim_lock_status == 2 ||mach_sim_lock_status == 3) {
                        // 已绑定
                        //SIM_LOCK_type('SIM卡正常') //正常不提示。
                    } else{
                        showAlert(Show_Msg, function () {
                        //window.location.reload(); //按项目需求，不循环刷新弹框。
                        });
                    }
                }else{
                    // /未绑定
                    MACH_SIM_LOCK_type = "机卡互锁状态: 未绑定"
                    SIM_LOCK_type_msg = "当前卡状态: "+SIM_LOCK_type
                    Show_Msg = MACH_SIM_LOCK_type+"<br><br>"+SIM_LOCK_type_msg
                    if (mach_sim_lock_status == 2 ||mach_sim_lock_status == 3) {
                        // 已绑定
                        //SIM_LOCK_type('SIM卡正常') //正常不提示。
                    } else{
                        showAlert(Show_Msg, function () {
                            //window.location.reload(); //不循环刷新弹框
                        });
                    }
                }
            }
            };
            self.GETDATA();
            }
           

        }

        var homeUtil = {
            initStatus: null,

            initShownStatus: function (data) {
                this.initStatus = {};
                var ipv6Mode = data.ipv6PdpType.toLowerCase().indexOf("v6") > 0;
                if(config.RJ45_SUPPORT){
                    var mode = checkCableMode(data.blc_wan_mode);
                    if (mode) {
                        this.initStatus.showIpv6WanIpAddr = false;
                        this.initStatus.showIpv4WanIpAddr = true;
                    } else if (config.IPV6_SUPPORT) {//支持IPV6
                        if (data.pdpType == "IP") {//ipv4
                            this.initStatus.showIpv6WanIpAddr = false;
                            this.initStatus.showIpv4WanIpAddr = true;
                        } else if (ipv6Mode) {//ipv6(&ipv4)
                            if (data.ipv6PdpType == "IPv6") {
                                this.initStatus.showIpv6WanIpAddr = true;
                                this.initStatus.showIpv4WanIpAddr = false;
                            } else {
                                this.initStatus.showIpv6WanIpAddr = true;
                                this.initStatus.showIpv4WanIpAddr = true;
                            }
                        }
                    } else {//不支持IPV6
                        this.initStatus.showIpv6WanIpAddr = false;
                        this.initStatus.showIpv4WanIpAddr = true;
                    }
                } else {
                    if (config.IPV6_SUPPORT) {//支持IPV6
                        if (data.pdpType == "IP") {//ipv4
                            this.initStatus.showIpv6WanIpAddr = false;
                            this.initStatus.showIpv4WanIpAddr = true;
                        } else if (ipv6Mode) {//ipv6(&ipv4)
                            if (data.ipv6PdpType == "IPv6") {
                                this.initStatus.showIpv6WanIpAddr = true;
                                this.initStatus.showIpv4WanIpAddr = false;
                            } else {
                                this.initStatus.showIpv6WanIpAddr = true;
                                this.initStatus.showIpv4WanIpAddr = true;
                            }
                        }
                    } else {//不支持IPV6
                        this.initStatus.showIpv6WanIpAddr = false;
                        this.initStatus.showIpv4WanIpAddr = true;
                    }
                }
            },
            /**
             * 获取wanIP地址
             * @method getWanIpAddr
             */	
            getWanIpAddr: function (data) {
                var addrInfo = {
                    wanIpAddress: '',
                    ipv6WanIpAddress: ''
                };
                addrInfo.wanIpAddress = verifyDeviceInfo(data.wanIpAddress);
                addrInfo.ipv6WanIpAddress = verifyDeviceInfo(data.ipv6WanIpAddress);
                return addrInfo;
            },
			cachedAPStationBasic: null,
            cachedConnectionMode: null,
            /**
             * 获取modem是否可以连接状态
             * @method getCanConnectNetWork
             */	
            getCanConnectNetWork: function (vm) {
                var status = service.getStatusInfo();
                if (status.simStatus != "modem_init_complete") {
                    return false;
                }
                var networkTypeTmp = status.networkType.toLowerCase();
                if(networkTypeTmp == 'searching'){
                    return false;                    
                }
                if (networkTypeTmp == '' || networkTypeTmp == 'limited service') {
                    networkTypeTmp = 'limited_service';
                }
                if (networkTypeTmp == 'no service') {
                    networkTypeTmp = 'no_service';
                }
                if(networkTypeTmp == 'limited_service' || networkTypeTmp == 'no_service') {                    
                    if(vm.cStatus() != CONNECT_STATUS.CONNECTED){
                        return false; 
                    }
                }

                if (config.AP_STATION_SUPPORT) {
                    if (status.connectWifiStatus == "connect") {
                        if (status.ap_station_mode == "wifi_pref") {
							return false;
                        }
                    }
                }
                return true;
            },
            doConnect: function () {
                showLoading('connecting');
                service.connect({}, function (data) {
                    if (data.result) {
                        successOverlay();
                    } else {
                        errorOverlay();
                    }
                });
            },
            /**
             * 更新主界面各个状态值
             * @method refreshHomeData
             */	
            refreshHomeData: function (vm) {
                var info = service.getConnectionInfo();
                vm.connectStatus(info.connectStatus);
                vm.canConnect(this.getCanConnectNetWork(vm));
                vm.networkType(homeUtil.getNetworkType(info.networkType));
                if (info.connectStatus == "ppp_connected") {
                    vm.current_Flux(transUnit(parseInt(info.data_counter.currentReceived, 10) + parseInt(info.data_counter.currentSent, 10), false));
                    vm.connected_Time(transSecond2Time(info.data_counter.currentConnectedTime));
                    vm.up_Speed(transUnit(info.data_counter.uploadRate, true));
                    vm.down_Speed(transUnit(info.data_counter.downloadRate, true));
                } else {
                    vm.current_Flux(transUnit(0, false));
                    vm.connected_Time(transSecond2Time(0));
                    vm.up_Speed(transUnit(0, true));
                    vm.down_Speed(transUnit(0, true));
                }

                vm.trafficAlertEnable(info.limitVolumeEnable);
                if (info.limitVolumeEnable) {
                    if (info.limitVolumeType == '1') { // Data
                        vm.trafficUsed(transUnit(parseInt(info.data_counter.monthlySent, 10) + parseInt(info.data_counter.monthlyReceived, 10), false));
                        vm.trafficLimited(transUnit(info.limitDataMonth, false));
                    } else { // Time
                        vm.trafficUsed(transSecond2Time(info.data_counter.monthlyConnectedTime));
                        vm.trafficLimited(transSecond2Time(info.limitTimeMonth));
                    }
                }
				
				if(originalLan != window.language){
				    originalLan = window.language;
				    refreshCount = 1;
			    }
				
                if(vm.showTraffic()) {
                    homeUtil.updateEcharts(info);
                } else {
                    homeUtil.allFreeEcharts();
                }

                homeUtil.refreshStationInfo(vm);
            },
            /**
             * 流量图设置为流量管理关闭状态
             * @method allFreeEcharts
             */	
            allFreeEcharts: function() {
                var usedData = homeUtil.data.free;
                usedData.value = 1;
                usedData.selected = false;
				usedData.name = $.i18n.prop("echarts_no");
                chartOptions.series[0].data = [usedData];
                chartOptions.title.text = '';
                homeUtil.setEcharts(chartOptions,$.i18n.prop("echarts_no"));
            },
            /**
             * 适配networkType
             * @method getNetworkType
             */	
            getNetworkType: function (networkType) {
                var networkTypeTmp = networkType.toLowerCase();
                if (networkTypeTmp == '' || networkTypeTmp == 'limited service') {
                    networkTypeTmp = 'limited_service';
                }
                if (networkTypeTmp == 'no service') {
                    networkTypeTmp = 'no_service';
                }
                if (networkTypeTmp == 'limited_service' || networkTypeTmp == 'no_service') {
                    return $.i18n.prop("network_type_" + networkTypeTmp);
                } else {
                    return networkType;
                }
            },
            /**
             * 流量图各区域初始值配置
             * @object data
             */
            data: {
                start: {
                    value: 50,
                    name: '提醒值内未使用',
                    itemStyle: {
                        normal: {
                            color: '#D8D8D8'
                        }
                    }
                },
                alarm: {
                    value: 19.7,
                    name: '警戒区',
                    itemStyle: {
                        normal: {
                            color: '#8CC916'
                        }
                    }
                },
                alert: {
                    value: 1,
                    name: '提醒值',
                    itemStyle: {
                        normal: {
                            color: '#FF5500'
                        }
                    }
                },
                free: {
                    value: 50,
                    name: '未使用',
                    itemStyle: {
                        normal: {
                            color: '#D8D8D8'
                        }
                    }
                },
                left1: {
                    value: 50,
                    name: '提醒值内未使用',
                    itemStyle: {
                        normal: {
                            color: '#D8D8D8'
                        }
                    }
                },
                used: {
                    value: 30,
                    name: '已使用',
                    itemStyle: {
                        normal: {
                            color: '#8CC916'
                        }
                    }
                },
                full: {
                    value: 30,
                    name: '流量超出',
                    itemStyle: {
                        normal: {
                            color: '#DF4313'
                        }
                    }
                }
            },
            oldUsedData: null,
            oldAlarmData: null,
        /**
         * 更新流量图各区域数值和提示语配置
         * @method updateEcharts
         */
            updateEcharts: function (info) {
                var startName = $.i18n.prop("echarts_no");
                refreshCount++;
                if (refreshCount % 10 != 2) {
                    return false;
                }
                var total = 0, used = 0, reach = 0, left = 0, alarm = 0, left1 = 0;
                if (info.limitVolumeEnable) { //开启
                    startName = $.i18n.prop("echarts_used");
                    chartOptions.series[0].data = [];
                    if (info.limitVolumeType == '1') { // 数据
                        var limitedDataFormatted = transUnit(info.limitDataMonth, false);
                        chartOptions.series[0].data = [];
                        if (info.limitDataMonth == 0) {
                            var usedData = homeUtil.data.used;
                            usedData.value = 1;
                            usedData.selected = false;
                            usedData.name = $.i18n.prop("echarts_used");
                            chartOptions.series[0].data.push(usedData);
                        } else {
                            var dataInfo = homeUtil.getDataInfo(limitedDataFormatted);
                            total = dataInfo.data * homeUtil.getUnitValue(dataInfo.unit) * 1048576;
                            used = parseInt(info.data_counter.monthlySent, 10) + parseInt(info.data_counter.monthlyReceived, 10);
                            reach = total * info.limitVolumePercent / 100;
                            if (used >= total) {
                                var fullData = homeUtil.data.full;
                                fullData.value = 100;
                                fullData.name = $.i18n.prop("echarts_full");
                                chartOptions.series[0].data.push(fullData);
                                startName = $.i18n.prop("echarts_full");
                            } else {
                                if (reach - used > 0) {
                                    left1 = reach - used;
                                    left = total - reach;
                                } else {
                                    alarm = used - reach;
                                    left = total - used;
                                }
                                var usedData = homeUtil.data.used;
                                if (reach - used > 0) {
                                    usedData.value = used;
                                } else {
                                    usedData.value = reach;
                                }
                                usedData.name = $.i18n.prop("echarts_used");
                                chartOptions.series[0].data.push(usedData);
								
                                if (left1 > 0) {
                                    var left1Data = homeUtil.data.left1;
                                    left1Data.value = left1;
                                    left1Data.name = $.i18n.prop("echarts_left1");
                                    chartOptions.series[0].data.push(left1Data);
                                }
								
                                var alertData = homeUtil.data.alert;
                                alertData.value = total / 200;
                                alertData.name = $.i18n.prop("echarts_alert");
                                chartOptions.series[0].data.push(alertData);
								
                                if (alarm > 0) {
                                    var alarmData = homeUtil.data.alarm;
                                    alarmData.value = alarm;
                                    alarmData.name = $.i18n.prop("echarts_alarm");
                                    chartOptions.series[0].data.push(alarmData);
                                }
								
                                var freeData = homeUtil.data.free;
                                freeData.value = left;
                                freeData.name = $.i18n.prop("echarts_free");
                                chartOptions.series[0].data.push(freeData);
                            }
                        }
                    } else { //时间
                        //chartOptions.title.text = (info.limitTimeMonth / 3600) + $.i18n.prop('hours');
                        chartOptions.series[0].data = [];
                        if (info.limitTimeMonth == 0) {
                            var usedData = homeUtil.data.used;
                            usedData.value = 1;
                            usedData.selected = false;
                            usedData.name = $.i18n.prop("echarts_used");
                            chartOptions.series[0].data.push(usedData);
                        } else {
                            total = info.limitTimeMonth;
                            used = info.data_counter.monthlyConnectedTime;
                            reach = total * info.limitVolumePercent / 100;
                            if (used >= total) {
                                var fullTime = homeUtil.data.full;
                                fullTime.value = 100;
                                fullTime.name = $.i18n.prop("echarts_full");
                                chartOptions.series[0].data.push(fullTime);
                                startName = $.i18n.prop("echarts_full");
                            } else {
                                if (reach - used > 0) {
                                    left1 = reach - used;
                                    left = total - reach;
                                } else {
                                    alarm = used - reach;
                                    left = total - used;
                                }
								
                                var usedTime = homeUtil.data.used;
                                if (reach - used > 0) {
                                    usedTime.value = used;
                                } else {
                                    usedTime.value = reach;
                                }
                                usedTime.name = $.i18n.prop("echarts_used");
                                chartOptions.series[0].data.push(usedTime);
								
                                if (left1 > 0) {
                                    var left1Time = homeUtil.data.left1;
                                    left1Time.value = left1;
                                    left1Time.name = $.i18n.prop("echarts_left1");
                                    chartOptions.series[0].data.push(left1Time);
                                }
								
                                var alertTime = homeUtil.data.alert;
                                alertTime.value = total / 200;
                                alertTime.name = $.i18n.prop("echarts_alert");
                                chartOptions.series[0].data.push(alertTime);
								
                                if (alarm > 0) {
                                    var alarmTime = homeUtil.data.alarm;
                                    alarmTime.value = alarm;
                                    alarmTime.name = $.i18n.prop("echarts_alarm");
                                    chartOptions.series[0].data.push(alarmTime);
                                }
								
                                var freeTime = homeUtil.data.free;
                                freeTime.value = left;
                                freeTime.name = $.i18n.prop("echarts_free");
                                chartOptions.series[0].data.push(freeTime);
                            }
                        }
                    }
                } else {
                    var usedData = homeUtil.data.used;
                    usedData.value = 1;
                    usedData.selected = false;
                    usedData.name = $.i18n.prop("echarts_no");
                    chartOptions.series[0].data = [usedData];
                    chartOptions.title.text = '';
                }
                var firstEle = _.find(chartOptions.series[0].data, function (n) {
                    return n.name == $.i18n.prop("echarts_used");
                });

                var alarmEle = _.find(chartOptions.series[0].data, function (n) {
                    return n.name == $.i18n.prop("echarts_alarm");
                });

                if(!alarmEle) {
                    alarmEle = {value: 0};
                }

                if(typeof firstEle == "undefined"){
                    homeUtil.setEcharts(chartOptions, startName);
                } else if(homeUtil.oldUsedData != firstEle.value || homeUtil.oldAlarmData != alarmEle.value) {
                    homeUtil.oldUsedData = firstEle.value;
                    homeUtil.oldAlarmData = alarmEle.value;
                    homeUtil.setEcharts(chartOptions, startName);
                }
            },
        /**
         * 调用Echarts接口进行流量图重绘
         * @method setEcharts
         */
            setEcharts: function (options, startName) {
                var startPart = homeUtil.data.start;
                startPart.value = 0;
                startPart.name = startName;
                startPart.selected = false;
                var arr = [startPart].concat(options.series[0].data);
                options.series[0].data = arr;
                myChart.setOption(options, true);
                addTimeout(function () {
                    myChart.resize();
                }, 1000);
            },
        /**
         * 流量单位获取
         * @method getUnit
         */
            getUnit: function (val) {
                if (val == '1024') {
                    return 'GB';
                } else if (val == '1048576') {
                    return 'TB';
                } else {
                    return 'MB';
                }
            },
        /**
         * 单位对应值获取
         * @method getUnitValue
         */
            getUnitValue: function (unit) {
                unit = unit.toUpperCase();
                if (unit == 'GB') {
                    return '1024';
                } else if (unit == 'TB') {
                    return '1048576';
                } else {
                    return '1';
                }
            },
        /**
         * 获取流量值和对应单位值
         * @method getDataInfo
         */
            getDataInfo: function (value) {
                return {
                    data: /\d+(.\d+)?/.exec(value)[0],
                    unit: /[A-Z]{1,2}/.exec(value)[0]
                }
            },
        /**
         * 更新已连接设备数
         * @method refreshStationInfo
         */
            refreshStationInfo: function (vm) {
                vm.wirelessDeviceNum(service.getStatusInfo().wirelessDeviceNum);
                if (refreshCount % 10 == 2) {
                    service.getAttachedCableDevices({}, function (data) {
                        vm.wireDeviceNum(data.attachedDevices.length);
                    });
                }
            },
        /**
         * 更新当前工作模式状态
         * @method refreshOpmodeInfo
         */
            refreshOpmodeInfo: function (vm) {
                var obj = service.getOpMode();
                vm.isLoggedIn(obj.loginfo == "ok");
                var currentMode = checkCableMode(obj.blc_wan_mode);//true为有线模式
				
                if(vm.opCurMode() && !currentMode){//有线模式切无线模式，无卡或锁网状态
                    var data = service.getLoginData();
                    var state = data.modem_main_state;
                    if(state == "modem_sim_undetected" || state == "modem_undetected" || state == "modem_sim_destroy" || state == "modem_waitpin" || state == "modem_waitpuk" || state == "modem_imsi_waitnck"){
                        window.location.reload();
                        return;
                    }					
                }
                vm.opCurMode(currentMode);
				
                if (currentMode && obj.ethwan_mode == "DHCP") {
                    vm.enableFlag(false);
                } else if ((!currentMode && obj.ppp_status != "ppp_disconnected") || (currentMode && obj.rj45_state != "idle" && obj.rj45_state != "dead")) {
                    vm.enableFlag(true);
                } else {
                    vm.enableFlag(false);
                }
                var mode = (obj.blc_wan_mode == "AUTO_PPP" || obj.blc_wan_mode == "AUTO_PPPOE") ? "AUTO" : obj.blc_wan_mode;
                var currentOpMode = "";
                switch (mode) {
                    case "AUTO":
                        currentOpMode = "opmode_auto";
                        break;
                    case "PPPOE":
                        currentOpMode = "opmode_cable";
                        break;
                    case "PPP":
                        currentOpMode = "opmode_gateway";
                        break;
                    default:
                        break;
                }
                $("#opmode").attr("data-trans", currentOpMode).text($.i18n.prop(currentOpMode));
				
                vm.isShowHomeConnect(!currentMode);
                vm.showTraffic(config.TRAFFIC_SUPPORT && !currentMode);
                vm.isSupportQuicksetting(config.HAS_QUICK_SETTING && !currentMode);//APN 是否支持有关
            }
        };
		
        /**
         * 初始化 ViewModel，并进行绑定
         * @method init
         */
        function init() {
            refreshCount = 0;
            homeUtil.oldUsedData = null;
            homeUtil.oldAlarmData = null;
            myChart = echarts.init($("#traffic_graphic")[0]);
            var container = $('#container')[0];
            ko.cleanNode(container);
            var vm = new HomeViewMode();
            ko.applyBindings(vm, container);
			addInterval(function(){
				vm.FreshParam();
				},1000);				
        }

        return {
            init: init
        };
    });
