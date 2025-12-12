define([ 'underscore', 'jquery', 'config/config'], function(_, $, config) {
    /**
     * Service
     * @module service
     * @class service
     */
	var wifiCallbackDestination = window;
	var unknownErrorObject = {
		errorType : 'UnknownError',
		errorId : '123',
		errorText : 'UnknownError'
	};

	var isTest = config.IS_TEST;
    var timerUpdaterEnable = true;
	// in Product Env, isTest should  be falselogin_user
	/**
	 * Ajax同步调用
	 * @method syncRequest
	 * @param {Object} params json参数对象
	 * @param {Boolean} isPost 是否为post方法
	 */
	function syncRequest(params, isPost) {
		return ajaxRequest(params, null, null, false, isPost);
	}

	/**
	 * Ajax异步调用
	 * @method asyncRequest
	 * @param {Object} params json参数对象
	 * @param {Function} successCallback 成功回调函数
	 * @param {Function} errorCallback 失败回调函数
	 * @param {Boolean} isPost 是否为post方法
	 */
	function asyncRequest(params, successCallback, errorCallback, isPost) {
		ajaxRequest(params, successCallback, errorCallback, true, isPost);
	}

	/**
	 * Ajax异步调用
	 * @method ajaxRequest
	 * @param {Object} params json参数对象
	 * @param {Function} successCallback 成功回调函数
	 * @param {Function} errorCallback 失败回调函数
	 * @param {Boolean} async 是否为异步方法
	 * @param {Boolean} isPost 是否为post方法
	 */
	function ajaxRequest(params, successCallback, errorCallback, async, isPost) {
		var result = null;
		if(params.isTest){
				result = simulate.simulateRequest(params, successCallback, errorCallback, async, isPost);
				if (async) {
					setTimeout(function() {successCallback(result);}, getRandomInt(120) + 50);
					return;
				}else{
					return result;
				}
		}
		$.ajax({
			type : !!isPost ? "POST" : "GET",
			url : isPost ? "/goform/goform_set_cmd_process" : params.cmd ? "/goform/goform_get_cmd_process"
					: "/goform/goform_set_cmd_process",
			data : params,
			dataType : "json",
			async : !!async,
			cache : false,
			error : function(data) {
				if (async) {
					errorCallback(data);
				} else if(data.status == 200) {
					result = jQuery.parseJSON(data.responseText );
				}
			},
			success : function(data) {
				if (async) {
					successCallback(data);
				} else {
					result = data;
				}
			}
		});
		if (!async) {
			return result;
		}
	}

	/**
	 * doStuff业务处理函数
	 * @method doStuff
	 * @param {Object} params json参数对象
	 * @param {Object} result 错误对象
	 * @param {Function} prepare 数据准备函数
	 * @param {Function} dealMethod 结果适配函数
	 * @param {Object} errorObject 默认错误对象
	 * @param {Boolean} isPost 是否为post方法
	 */
	function doStuff(args, result, prepare, dealMethod, errorObject, isPost) {
		var params = args[0], callback = args[1], errorCallback = args[2];
		var objectToReturn;

		if (result && typeof result.errorType === 'string') {
			objectToReturn = $.extend(unknownErrorObject, result);

			if (!callback) {
				return objectToReturn;
			}
			doCallback(objectToReturn, callback, errorCallback);
		} else {
			objectToReturn = $.extend({}, result); // Duplicate it.

			var requestParams;
			if (prepare) {
				requestParams = prepare(params, isPost);
			} else {
				requestParams = params;
			}
			if (!callback) {
				if (requestParams && (requestParams.cmd || requestParams.goformId)) {
					var r = syncRequest(requestParams, isPost);
					if (dealMethod) {
						objectToReturn = $.extend({}, dealMethod(r));
					}else{
                        objectToReturn = r;
                    }
				}
				return objectToReturn;
			} else {
				if (requestParams && (requestParams.cmd || requestParams.goformId)) {
					asyncRequest(requestParams, function(data) {
						if (dealMethod) {
							objectToReturn = $.extend({}, dealMethod(data));
						} else {
							objectToReturn = $.extend({}, data);
						}
						//手动处理callback
						if(!requestParams.notCallback){
							doCallback(objectToReturn, callback, errorCallback);
						}
					}, function() {
						if (errorObject) {
							objectToReturn = $.extend(unknownErrorObject, errorObject);
						} else {
							objectToReturn = $.extend(unknownErrorObject, {
								errorType : 'Unknown'
							});
						}
						doCallback(objectToReturn, callback, errorCallback);
					}, isPost);
				} else {
					doCallback(objectToReturn, callback, errorCallback);
				}
			}
		}
		function doCallback(resultToReturn, callback, errorCallback) {
			errorCallback = errorCallback ? errorCallback : callback;
			if (isErrorObject(resultToReturn)) {
				switch (resultToReturn.errorType) {
				case 'cellularNetworkError':
				case 'deviceError':
				case 'wifiConnectionError':
					wifiCallbackDestination.receivedNonSpecificError(resultToReturn);
					break;
				default:
					errorCallback(resultToReturn);
				}
			} else {
				callback(resultToReturn);
			}
		}
	}

	/**
	 * 获取基本的wifi信息
	 * @method getWifiBasic
	 * @return {Object} wifi JSON 对象
	 */
    function getWifiBasic() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            var wpapsk = config.PASSWORD_ENCODE ? "WPAPSK1_encode,m_WPAPSK1_encode," : "WPAPSK1,m_WPAPSK1,";
            requestParams.cmd = "hide_web_fota_all,hide_web_fota,sn_boardnum,hide_sn,hide_sim_iccid,display_model,cellid_hide,m_ssid_enable,wifi_cur_state,has_wifi,NoForwarding,m_NoForwarding," + wpapsk + "MAX_Station_num,"+
            "hide_band,hide_wfrcn_pci,hide_wifi_password,user_web_disp_privacy_statement,user_web_disp_opensource_statement,"+
                "SSID1,AuthMode,HideSSID,MAX_Access_num,show_qrcode_flag,EncrypType,Key1Str1,Key2Str1,Key3Str1,Key4Str1,DefaultKeyID," +
                "m_SSID,m_AuthMode,m_HideSSID,m_MAX_Access_num,m_EncrypType,m_show_qrcode_flag,m_DefaultKeyID,m_Key1Str1,m_Key2Str1,m_Key3Str1,m_Key4Str1,rotationFlag,wifi_sta_connection,disable_m_ssid,disable_qrcode,need_support_pb,need_support_sms,network_display,has_battery,user_web_hide_ddns,sleepmode_display,net_selfcheck_display,user_web_hide_wifi,wifi_sta_need_display,disable_traffic_manager";

            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {
                    hide_web_fota: data.hide_web_fota,
                    hide_web_fota_all: data.hide_web_fota_all,
                    hide_sn: data.hide_sn,
                    sn_boardnum: data.sn_boardnum,
                    hide_sim_iccid: data.hide_sim_iccid,
                    display_model: data.display_model,
                    cellid_hide: data.cellid_hide,
                    user_web_disp_privacy_statement: data.user_web_disp_privacy_statement != "" ? 1 :0,
                    user_web_disp_opensource_statement: data.user_web_disp_opensource_statement != "" ? 1 :0,
					hide_band:                  data.hide_band =="1" ? "1" : "2",
					hide_wfrcn_pci:             data.hide_wfrcn_pci =="1" ? "1" : "2",
					hide_wifi_password:         data.hide_wifi_password == "1" ? 1 : 2,
					wifi_enable:data.wifi_cur_state =="1" ? "1" : "0",
                    has_wifi: data.has_wifi == '1' ? '1' : '0',
                    multi_ssid_enable:data.m_ssid_enable,
                    MAX_Station_num: $.isNumeric(data.MAX_Station_num) ? data.MAX_Station_num : config.MAX_STATION_NUMBER,
                    //ssid 1
                    AuthMode:data.AuthMode,
                    SSID:data.SSID1,
                    broadcast:data.HideSSID,
					apIsolation:data.NoForwarding,
                    passPhrase: config.PASSWORD_ENCODE ? Base64.decode(data.WPAPSK1_encode) : data.WPAPSK1,
                    MAX_Access_num: data.MAX_Access_num,
                    cipher: data.EncrypType == "TKIP"? "0" : data.EncrypType == "AES"? 1 : 2,
					encryptType: data.EncrypType,
                    show_qrcode_flag:data.show_qrcode_flag == "1" ? true : false,
					keyID:data.DefaultKeyID,
					Key1Str1:data.Key1Str1,
					Key2Str1:data.Key2Str1,
					Key3Str1:data.Key3Str1,
					Key4Str1:data.Key4Str1,
                    //ssid 2
                    m_SSID:data.m_SSID,
                    m_broadcast:data.m_HideSSID,
					m_apIsolation:data.m_NoForwarding,
                    m_MAX_Access_num:data.m_MAX_Access_num,
                    m_AuthMode:data.m_AuthMode,
                    m_passPhrase: config.PASSWORD_ENCODE ? Base64.decode(data.m_WPAPSK1_encode) : data.m_WPAPSK1,
                    m_cipher:data.m_EncrypType == "TKIP"? "0" : data.m_EncrypType == "AES"? 1 : 2,
                    m_show_qrcode_flag:data.m_show_qrcode_flag == "1" ? true : false,
					m_encryptType:data.m_EncrypType,
					m_keyID:data.m_DefaultKeyID,
					m_Key1Str1:data.m_Key1Str1,
					m_Key2Str1:data.m_Key2Str1,
					m_Key3Str1:data.m_Key3Str1,
					m_Key4Str1:data.m_Key4Str1,
					disable_m_ssid:data.disable_m_ssid,
					disable_qrcode:data.disable_qrcode,
					need_support_sms:data.need_support_sms,
					need_support_pb:data.need_support_pb,
					network_display:data.network_display,
					wifi_sta_need_display:data.wifi_sta_need_display,
					// sleepmode_display : data.sleepmode_display,
				    sleepmode_display : data.user_web_hide_wifi == '1' ? "no" :data.sleepmode_display ,
					net_selfcheck_display:data.net_selfcheck_display,
					user_web_hide_ddns:data.user_web_hide_ddns,
					user_web_hide_wifi:data.user_web_hide_wifi,

                    rotationFlag:data.rotationFlag,
                    ap_station_enable:data.wifi_sta_connection,

                    disable_traffic_manager:data.disable_traffic_manager
                };
                return result;
            } else {
                return unknownErrorObject;
            }
        }
    }

	/**
	 * 设置基本的wifi信息(SSID1)
	 * @method setWifiBasic(SSID1)
	 * @param {Object} JSON 参数对象
	 * @return {Object}
	 */
	function setWifiBasic() {
        doStuffAndCheckServerIsOnline(arguments, prepare, deal);

		function prepare(params) {
			var requestParams = {
				goformId : "SET_WIFI_SSID1_SETTINGS",
				isTest : isTest,
				ssid : params.SSID,
                broadcastSsidEnabled : params.broadcast,
                MAX_Access_num : params.station,
                security_mode: params.AuthMode,
                cipher: params.cipher,
                NoForwarding: params.NoForwarding,
                show_qrcode_flag: params.show_qrcode_flag
			};
            if(config.WIFI_WEP_SUPPORT){
                requestParams.wep_default_key = params.wep_default_key;
                requestParams.wep_key_1 = params.wep_key_1;
                requestParams.wep_key_2 = params.wep_key_2;
                requestParams.wep_key_3 = params.wep_key_3;
                requestParams.wep_key_4 = params.wep_key_4;
                if(params.wep_default_key =='1'){
                    requestParams.WEP2Select = params.WEP2Select;
                }else if(params.wep_default_key =='2'){
                    requestParams.WEP3Select = params.WEP3Select;
                }else if(params.wep_default_key =='3'){
                    requestParams.WEP4Select = params.WEP4Select;
                }else{
                    requestParams.WEP1Select = params.WEP1Select;
                }
            }
            if(params.AuthMode == "WPAPSK" || params.AuthMode == "WPA2PSK" || params.AuthMode == "WPAPSKWPA2PSK"||params.AuthMode == "WPA3Personal"||params.AuthMode == "WPA2WPA3") {
                requestParams.security_shared_mode = params.cipher;
                requestParams.passphrase = config.PASSWORD_ENCODE ?Base64.encode(params.passPhrase): params.passPhrase;
            }else if (params.AuthMode == "SHARED"){
                requestParams.security_shared_mode = "WEP";
                requestParams.security_mode = "SHARED";
            }else {
                if(params.encryptType == "WEP") {
                    requestParams.security_shared_mode = "WEP";
                    requestParams.security_mode = "OPEN";
                }else{
                    requestParams.security_shared_mode = "NONE";
                }
            }

			return requestParams;
		}

		function deal(data) {
			if (data) {
				return data;
			} else {
				return unknownErrorObject;
			}
		}
	}

    /**
     * 设置基本的wifi信息(SSID2)
     * @method setWifiBasic(SSID2)
     * @param {Object} JSON 参数对象
     * @return {Object}
     */
    function setWifiBasic4SSID2() {
        doStuffAndCheckServerIsOnline(arguments, prepare, deal);

        function prepare(params) {
            var requestParams = {
                goformId : "SET_WIFI_SSID2_SETTINGS",
                isTest : isTest,
                m_SSID : params.m_SSID,
                m_HideSSID : params.m_broadcast,
                m_MAX_Access_num:params.m_station,
                m_AuthMode: params.m_AuthMode,
                cipher: params.m_cipher,
                m_NoForwarding: params.m_NoForwarding,
                m_show_qrcode_flag: params.m_show_qrcode_flag
            };

            if(config.WIFI_WEP_SUPPORT){
                requestParams.m_DefaultKeyID = params.m_wep_default_key;
                requestParams.m_Key1Str1 = params.m_wep_key_1;
                requestParams.m_Key2Str1 = params.m_wep_key_2;
                requestParams.m_Key3Str1 = params.m_wep_key_3;
                requestParams.m_Key4Str1 = params.m_wep_key_4;
                if(params.m_wep_default_key =='1'){
                    requestParams.m_Key2Type = params.m_WEP2Select;
                }else if(params.m_wep_default_key =='2'){
                    requestParams.m_Key3Type = params.m_WEP3Select;
                }else if(params.m_wep_default_key =='3'){
                    requestParams.m_Key4Type = params.m_WEP4Select;
                }else{
                    requestParams.m_Key1Type = params.m_WEP1Select;
                }
            }

			if(params.m_AuthMode == "WPAPSK" || params.m_AuthMode == "WPA2PSK" || params.m_AuthMode == "WPAPSKWPA2PSK") {
                requestParams.m_EncrypType = params.m_cipher;
                requestParams.m_WPAPSK1 = config.PASSWORD_ENCODE ?Base64.encode(params.m_passPhrase): params.m_passPhrase;
            }else if (params.m_AuthMode == "SHARED"){
                requestParams.m_EncrypType = "WEP";
                requestParams.m_security_mode = "SHARED";
            }else {
                if(params.m_encryptType == "WEP") {
                    requestParams.m_EncrypType = "WEP";
                    requestParams.m_security_mode = "OPEN";
                }else{
                    requestParams.m_EncrypType = "NONE";
                }
            }

            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 设置基本的wifi信息
     * @method setWifiBasic
     * @param {Object} JSON 参数对象
     * @example
     * @return {Object}
     */
    function setWifiBasicMultiSSIDSwitch() {
        doStuffAndCheckServerIsOnline(arguments, prepare, deal);

        function prepare(params) {
			var paraTemp = params;
			if(params.wifiEnabled == '0') {
				paraTemp = {
					wifiEnabled: params.wifiEnabled
				}
			}

			var requestParams = $.extend({
				goformId : "SET_WIFI_INFO",
				isTest : isTest
			}, paraTemp);
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }
    /**
     * 获取wifi安全设置信息
     * @method getSecurityInfo
     * @return {Object} wifi 安全 json 对象
     */
	function getSecurityInfo() {
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
        	var requestParams = {};
			requestParams.isTest = isTest;
        	requestParams.cmd = "AuthMode,passPhrase";
        	requestParams.multi_data = 1;
        	return requestParams;
        }

        function deal(data) {
        	if (data) {
        		var result = {};
        		result.AuthMode = data.AuthMode;
        		result.passPhrase = config.PASSWORD_ENCODE ? Base64.decode(data.passPhrase) : data.passPhrase;
        		return result;
        	} else {
        		return unknownErrorObject;
        	}
        }
	}
    /**
     * 获取密码
     * @method git_admin_encrypsw
     * @return {Object} 加密的admin密码
     */
	function git_admin_encrypsw() {
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
        	var requestParams = {};
			requestParams.isTest = isTest;
        	requestParams.cmd = "admin_encrypsw";
        	requestParams.multi_data = 1;
        	return requestParams;
        }

        function deal(data) {
        	if (data) {
        		var result = {};
        		result.admin_encrypsw = Base64.decode(data.admin_encrypsw);
        		return result;
        	} else {
        		return unknownErrorObject;
        	}
        }
	}


	/**
     * 设置wifi安全设置信息
     * @method setSecurityInfo
     * @return {Object} wifi 安全 json 对象
     */
	function setSecurityInfo() {
		return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.isTest = isTest;
			requestParams.goformId = "SET_WIFI_SECURITY_INFO";
			requestParams.AuthMode = params.AuthMode;
            if(requestParams.AuthMode == "WPAPSKWPA2PSK") {
			    requestParams.passPhrase = config.PASSWORD_ENCODE ? Base64.encode(params.passPhrase) : params.passPhrase;
            }
			return requestParams;
		}

		function deal(data) {
			if (data) {
				return data;
			} else {
				return unknownErrorObject;
			}
		}
	}

    /**
     * DTU页面的设置函数
     * @method setDTUParams
     */
    function setDTUParams(){
        return doStuff(arguments, {}, prepare, deal, null, true);
        function prepare(params, isPost){
            var requestParams = {
                isTest: false,
                goformId: 'dtu_setting'
            };
            $.extend(requestParams, params);
            return requestParams;
        }
        function deal(data){
            if(data){
                return data;
            }else{
                return unknownErrorObject;
            }
        }
    }


    /**
     * 获取当前WiFi已连接设备的信息
     * @method getCurrentlyAttachedDevicesInfo
     * @return {Object} JSON
     * @example
     //返回结构格式
     * {
     *  macAddress:"E8-E3-A5-AB-86-44",
     *  ipAddress:"192.168.0.45",
     *  hostName:"myhostName",
     *  timeConnected:10
     * }
     */
    function getCurrentlyAttachedDevicesInfo(){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var obj = {
				isTest : isTest,
				cmd : "station_list"
			};
            return obj;
        }

        function deal(data) {
            var deviceArr = [];
            var attachedDevices = data.station_list;
            for(var i = 0; attachedDevices && i < attachedDevices.length; i++ ){
                var obj = {};
                obj.macAddress = attachedDevices[i].mac_addr;
                var hostname = attachedDevices[i].hostname;
                obj.hostName = hostname == "" ? $.i18n.prop("unknown") : hostname;
                obj.ipAddress = attachedDevices[i].ip_addr;//CPE 增加IP地址
                deviceArr.push(obj);
            }
            return {attachedDevices: deviceArr};
        }
    }

    /**
     * 获取当前有线已连接设备的信息
     * @method getAttachedCableDevices
     * @return {Object} JSON
     * @example
     //返回结构格式
     * {"lan_station_list":[{"hostname":"SANECHIPS-VII","mac_addr":"00:08:07:09:31:23"}]}
     */
    function getAttachedCableDevices(){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var obj = {
                isTest : isTest,
                cmd : "lan_station_list"
            };
            return obj;
        }

        function deal(data) {
            var deviceArr = [];
 //           var attachedDevices = data.lan_station_list || data.station_list;
            var attachedDevices = data.lan_station_list;
           for(var i = 0; attachedDevices && i < attachedDevices.length; i++ ){
                var obj = {};
                obj.macAddress = attachedDevices[i].mac_addr;
                var hostname = attachedDevices[i].hostname;
                obj.hostName = hostname == "" ? $.i18n.prop("unknown") : hostname;
                obj.ipAddress = attachedDevices[i].ip_addr;//CPE 增加IP地址
                deviceArr.push(obj);
            }
            return {attachedDevices: deviceArr};
        }
    }

    /**
     * 获取当前语言信息
     * @method getLanguage
     * @return {Object} JSON
     */
	function getLanguage() {
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
			requestParams.isTest = isTest;
            requestParams.cmd = "Language";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {};
                result.Language = (data && data.Language) ? data.Language : "en";
                return result;
            } else {
                return unknownErrorObject;
            }
        }
	}

	/**
     * 设置语言信息
     * @method getLanguage
	 * @param {Object} JSON 参数对象
     */
    function setLanguage() {
    	return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.isTest = isTest;
			requestParams.goformId = "SET_WEB_LANGUAGE";
			requestParams.Language = params.Language;
			return requestParams;
		}

		function deal(data) {
			if (data) {
				return data;
			} else {
				return unknownErrorObject;
			}
		}
    }

	/**
     * 读取当前选网模式
     * @method getNetSelectInfo
	 * @return {Object} JSON 参数对象
     */
    function getNetSelectInfo() {
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "current_network_mode,m_netselect_save,net_select_mode,m_netselect_contents,net_select,ppp_status,modem_main_state";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {};
                result.current_network_mode = data.current_network_mode;
                result.net_select_mode = data.net_select_mode;
                result.m_netselect_save = data.m_netselect_save;
                result.m_netselect_contents = data.m_netselect_contents;
                result.net_select = data.net_select;
                result.ppp_status = data.ppp_status;
                result.modem_main_state = data.modem_main_state;
                return result;
            } else {
                return unknownErrorObject;
            }
        }
	}

	/**
     * 设置自动选网的网络制式
     * @method setBearerPreference
     * @param {Object} JSON
     * @example
     */
	function setBearerPreference() {
		return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
        	var requestParams = {};
        	requestParams.isTest = isTest;
        	requestParams.goformId = "SET_BEARER_PREFERENCE";
        	requestParams.BearerPreference = params.strBearerPreference;
        	return requestParams;
        }

        function deal(data) {
        	if (data) {
        		return data;
        	} else {
        		return unknownErrorObject;
        	}
        }
    }


	/**************************************************************************
	 Description : scan the network
	 Parameters :
	 [IN] : function :callback(bResult, listNetwork) : call back function, and the parameters list below:
	 [IN] : bool   : bResult     : true = succeed, false = failed.
	 [IN] : object : listNetwork : network information array, the object attribute in the array below:
	 type   :   name                   : description
	 string : strFullName              : operator full name(the value is maybe ""),
	 such as 'china mobile'
	 string : strShortName             : operator short name(the value is maybe ""),
	 such as 'china mobile'
	 string : strNumeric               : the digital number, such as '460'
	 number : nRat                     : the network connect technology, 0 = '2G', 2 = '3G'.
	 number : nState : operator availability as int at+cops=? <stat> (This is as per 3GPP TS 27.007)
	 if get net work list failed, the return value will be an null array.
	 return : void
     @method scanForNetwork
	 **************************************************************************/
	function scanForNetwork(callback) {
        if(isTest) {
            setTimeout(function() {parseScanResult(simulate.m_netselect_contents);}, 500);
            return;
        }

        $.post("/goform/goform_set_cmd_process", {
            goformId : "SCAN_NETWORK"
        }, function(data) {
            if (data.result == "success") {
                checkScanStatus();
            } else {
                callback(false, []);
            }
        }, "json").error(function() {
                callback(false, []);
        });

        function checkScanStatus() {
            $.getJSON("/goform/goform_get_cmd_process", {
                cmd : "m_netselect_status",
                "_" : new Date().getTime()
            }, function(data) {
                if (data.m_netselect_status == "manual_selecting") {
                    setTimeout(checkScanStatus, 1000);
                } else {
                    $.getJSON("/goform/goform_get_cmd_process", {
                        cmd : "m_netselect_contents",
                        "_" : new Date().getTime()
                    }, function(data2) {
						if(trim(data2.m_netselect_contents) != "") {
							parseScanResult(data2.m_netselect_contents);
						} else {
							callback(false, []);
						}
                    }).error(function(){
                            callback(false, []);
                        });
                }
            }).error(function() {
                    callback(false, []);
                });
        }

		function parseScanResult(result) {
            //var result= "2,China Mobile,46002,2;2,China Mobile,46002,3"
            var pattern = /([^,;]*),([^,]*),([^,]*),([^,]*),([^,;]*)/g;
			var listNetwork = [];
			var mts;
			var unit = result.split(";");
			var unitString = "";
			for(i = 0;i < unit.length;i++){
				var unitLength = unit[i].split(",").length;
				if(unitLength == 4)
					{
				      unitString += unit[i]+",NON;";
					}
				else{
					  unitString += unit[i]+";";
				    }
			}
			while (mts = pattern.exec(unitString)) {
				if (mts != null) {
					listNetwork.push({
                        strShortName: mts[2].replace(/\"/g,''),
                        strNumeric: mts[3].replace(/\D/g,''),
                        nRat: parseInt(mts[4],10),
                        nState: parseInt(mts[1],10),
						SubAct: parseInt(mts[5],10)
					});
				}
			}
			callback(true, listNetwork);
		}
	}

    var timerInfo = {
		networkType : "",
		signalImg : "0",
        spn_b1_flag : "1",
        spn_name_data : "",
        spn_b2_flag : "1",
		networkOperator : "China Mobile",
		connectStatus : "ppp_disconnected",
		rj45ConnectStatus : "rj45_dead",
		attachedDevices : [],
		ssid1AttachedNum: 0,//wireless_num : 0,
		ssid2AttachedNum: 0,
        data_counter:{
        	uploadRate : 0,
    		downloadRate : 0,
    		totalSent : 0,
			totalReceived : 0,
			totalConnectedTime : 0,
			currentSent : 0,
			currentReceived : 0,
			currentConnectedTime : 0,
			monthlySent: 0,
			monthlyReceived: 0,
			monthlyConnectedTime: 0,
			month : ''
        },
	    newSmsReceived : false,
        smsReportReceived : false,
	    smsUnreadCount : "0",
	    isLoggedIn : undefined,
        limitVolumeEnable : false,
        limitVolumeType : '1',
	    limitVolumePercent : "100",
	    limitVolumeSize : "0",
	    allowRoamingUpdate : "0",
		blc_wan_mode: "",
		ap_station_enable: undefined,
		ap_station_mode:undefined,
		dialMode: '',
		ethWanMode:'AUTO',
        fota_user_selector:'',
	defaultWanName:""
    };

	/**
     * 读取当前设备常用基本信息
     * @method getStatusInfo
	 * @return {Object} JSON 参数对象
     */
    function getStatusInfo(){
		var displayData = getDisplay();
        if (timerInfo.isLoggedIn === undefined) {
            var loginStatus = getLoginStatus();
            return {
                user_web_disp_internet_ussd: timerInfo.user_web_disp_internet_ussd,
                networkType:timerInfo.networkType,
                signalImg:timerInfo.signalImg,
                networkOperator:timerInfo.networkOperator,
                telecomProviderSwitch: timerInfo.telecomProviderSwitch,
                spn_b1_flag : timerInfo.spn_b1_flag,
                spn_name_data : timerInfo.spn_name_data,
                spn_b2_flag : timerInfo.spn_b2_flag,
                connectStatus:timerInfo.connectStatus,
				rj45ConnectStatus:timerInfo.rj45ConnectStatus,
				ssid1AttachedNum: timerInfo.ssid1AttachedNum,
                ssid2AttachedNum: timerInfo.ssid2AttachedNum,
				wirelessDeviceNum: timerInfo.ssid1AttachedNum + timerInfo.ssid2AttachedNum,
                roamingStatus:timerInfo.roamingStatus,
                wifiStatus:timerInfo.wifiStatus,
                simStatus:timerInfo.simStatus,
                pinStatus:timerInfo.pinStatus,
                batteryStatus:timerInfo.batteryStatus,
                batteryLevel:timerInfo.batteryLevel,
                batteryPers:timerInfo.batteryPers,
                batteryTime:timerInfo.batteryTime,
                ssid:timerInfo.ssid,
                authMode:timerInfo.authMode,
                data_counter:timerInfo.data_counter,
                isLoggedIn:loginStatus.status == "loggedIn",
                newSmsReceived:timerInfo.newSmsReceived,
                smsReportReceived:timerInfo.smsReportReceived,
                smsUnreadCount:timerInfo.smsUnreadCount,
                limitVolumeEnable:timerInfo.limitVolumeEnable,
                limitVolumeType:timerInfo.limitVolumeType,
                limitVolumePercent:timerInfo.limitVolumePercent,
                limitVolumeSize:timerInfo.limitVolumeSize,
                connectWifiProfile:timerInfo.connectWifiProfile,
                connectWifiSSID:timerInfo.connectWifiSSID,
                connectWifiStatus:timerInfo.connectWifiStatus,
                multi_ssid_enable:timerInfo.multi_ssid_enable,
                roamMode: timerInfo.roamMode,
				blc_wan_mode: timerInfo.blc_wan_mode,
                current_upgrade_state: timerInfo.current_upgrade_state,
                is_mandatory: timerInfo.is_mandatory,
                new_version_state: timerInfo.new_version_state,
                allowRoamingUpdate: timerInfo.allowRoamingUpdate,
				ap_station_enable: timerInfo.ap_station_enable,
				ap_station_mode: timerInfo.ap_station_mode,
				dialMode: timerInfo.dialMode,
				fota_package_already_download:timerInfo.fota_package_already_download,
				ethWanMode:timerInfo.ethWanMode,
				fota_user_selector:timerInfo.fota_user_selector,
				defaultWanName:timerInfo.defaultWanName,
				has_battery:displayData.has_battery
            };
        }
        
    	return {
            user_web_disp_internet_ussd: timerInfo.user_web_disp_internet_ussd,
    		networkType : timerInfo.networkType,
    		signalImg : timerInfo.signalImg,
    		networkOperator : timerInfo.networkOperator,
            telecomProviderSwitch: timerInfo.telecomProviderSwitch,
            spn_b1_flag : timerInfo.spn_b1_flag,
            spn_name_data : timerInfo.spn_name_data,
            spn_b2_flag : timerInfo.spn_b2_flag,
    		connectStatus : timerInfo.connectStatus,
			rj45ConnectStatus:timerInfo.rj45ConnectStatus,
    		ssid1AttachedNum: timerInfo.ssid1AttachedNum,
            ssid2AttachedNum: timerInfo.ssid2AttachedNum,
			wirelessDeviceNum: timerInfo.ssid1AttachedNum + timerInfo.ssid2AttachedNum,
    		roamingStatus : timerInfo.roamingStatus,
    		wifiStatus : timerInfo.wifiStatus,
    		simStatus : timerInfo.simStatus,
            pinStatus : timerInfo.pinStatus,
    		batteryStatus: timerInfo.batteryStatus,
    		batteryLevel: timerInfo.batteryLevel,
            batteryPers: timerInfo.batteryPers,
            batteryTime :timerInfo.batteryTime,
            ssid : timerInfo.ssid,
            authMode: timerInfo.authMode,
            data_counter:timerInfo.data_counter,
            isLoggedIn:timerInfo.isLoggedIn,
            newSmsReceived : timerInfo.newSmsReceived,
            smsReportReceived : timerInfo.smsReportReceived,
            smsUnreadCount : timerInfo.smsUnreadCount,
            limitVolumeEnable : timerInfo.limitVolumeEnable,
            limitVolumeType : timerInfo.limitVolumeType,
    	    limitVolumePercent : timerInfo.limitVolumePercent,
    	    limitVolumeSize : timerInfo.limitVolumeSize,
            connectWifiProfile:timerInfo.connectWifiProfile,
            connectWifiSSID:timerInfo.connectWifiSSID,
            connectWifiStatus:timerInfo.connectWifiStatus,
            multi_ssid_enable:timerInfo.multi_ssid_enable,
	    	blc_wan_mode: timerInfo.blc_wan_mode,
            roamMode: timerInfo.roamMode,
            current_upgrade_state: timerInfo.current_upgrade_state,
            is_mandatory: timerInfo.is_mandatory,
            new_version_state: timerInfo.new_version_state,
            allowRoamingUpdate: timerInfo.allowRoamingUpdate,
			ap_station_enable: timerInfo.ap_station_enable,
			ap_station_mode: timerInfo.ap_station_mode,
			dialMode: timerInfo.dialMode,
			fota_package_already_download:timerInfo.fota_package_already_download,
			ethWanMode:timerInfo.ethWanMode,
			fota_user_selector:timerInfo.fota_user_selector,
			defaultWanName:timerInfo.defaultWanName,
			has_battery:displayData.has_battery
    	};
    }

	/**
	 * 获取联网及流量信息
	 * @method getConnectionInfo
	 * @return {Object} JSON 参数对象
	 */
    function getConnectionInfo(){
		var isData = timerInfo.limitVolumeType == '1';
		var result = {
			data_counter : timerInfo.data_counter,
			connectStatus : timerInfo.connectStatus,
			rj45ConnectStatus : timerInfo.rj45ConnectStatus,
			limitVolumeEnable : timerInfo.limitVolumeEnable,
			limitVolumeType : timerInfo.limitVolumeType,
            limitVolumePercent : timerInfo.limitVolumePercent,
            networkType: timerInfo.networkType
		};
		if(isData){
			result.limitDataMonth = timerInfo.limitVolumeSize;
			result.limitTimeMonth = 0;
		} else {
			result.limitTimeMonth = timerInfo.limitVolumeSize;
			result.limitDataMonth = 0;
		}
		result.blc_wan_mode = timerInfo.blc_wan_mode;
		return result;
    }

    /**
     * 将未读短信变量从接收到未读短信设置成没有接收到
     * @method resetNewSmsReceivedVar
     * @example
     * timerInfo.newSmsReceived = false;
     */
    function resetNewSmsReceivedVar(){
    	timerInfo.newSmsReceived = false;
    }

    /**
     * 将短信发送报告变量从接收到设置成没有接收到
     * @method resetSmsReportReceivedVar
     * @example
     * timerInfo.smsReportReceived = false;
     */
    function resetSmsReportReceivedVar(){
    	timerInfo.smsReportReceived = false;
    }

    /**
     * 获取短信容量。
     * @method getSmsCapability
	 * @return {Object} JSON 参数对象
     */
    function getSmsCapability(){
    	return doStuff(arguments, {}, prepare, deal, null, false);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.isTest = isTest;
			requestParams.cmd = "sms_capacity_info";
			return requestParams;
		}

		function deal(data) {
            return {
				nvTotal: parseInt(data.sms_nv_total,10),
				nvUsed: parseInt(data.sms_nv_rev_total,10) + parseInt(data.sms_nv_send_total,10) + parseInt(data.sms_nv_draftbox_total,10),
				simTotal: parseInt(data.sms_sim_total,10),
				simUsed: parseInt(data.sms_sim_rev_total,10) + parseInt(data.sms_sim_send_total,10) + parseInt(data.sms_sim_draftbox_total,10),
				nvReceive: parseInt(data.sms_nv_rev_total,10),
				nvSend: parseInt(data.sms_nv_send_total,10),
				nvDraft: parseInt(data.sms_nv_draftbox_total,10),
				simReceive: parseInt(data.sms_sim_rev_total,10),
				simSend: parseInt(data.sms_sim_send_total,10),
				simDraft: parseInt(data.sms_sim_draftbox_total,10)
			};
		}
    }

    /**
     * 联网
     * @method connect
     */
    function connect() {
		var callback = arguments[1];
        var checkPoint = 0;
		return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.isTest = isTest;
			requestParams.notCallback = true;
			requestParams.goformId = "CONNECT_NETWORK";
			return requestParams;
		}

		function deal(data) {
			if (data.result == "success") {
                checkPoint = new Date().getTime();
				addCallback(checkConnectStatus);
			} else {
				callback({
					result : false
				});
			}
		}

		function checkConnectStatus(data) {
			if (data.ppp_status == "ppp_connecting") {
				timerInfo.connectStatus = "ppp_connecting";
			} else if (data.ppp_status == "ppp_connected") {
				removeCallback(checkConnectStatus);
				timerInfo.connectStatus = "ppp_connected";
				callback({
					result : true,
					status : timerInfo.connectStatus
				});
			} else if(new Date().getTime() - checkPoint < 1e4){
                timerInfo.connectStatus = "ppp_connecting";
			} else {
				removeCallback(checkConnectStatus);
				callback({
					result : false
				});
			}
		}
	}

    /**
     * 断网
     * @method disconnect
     */
    function disconnect() {
		var callback = arguments[1];
        var checkPoint = 0;
		return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.isTest = isTest;
			requestParams.notCallback = true;
			requestParams.goformId = "DISCONNECT_NETWORK";
			return requestParams;
		}

		function deal(data) {
			if (data.result == "success") {
                checkPoint = new Date().getTime();
				addCallback(checkDisconnectStatus);
			} else {
				callback({
					result : false
				});
			}
		}

		function checkDisconnectStatus(data) {
			if (data.ppp_status == "ppp_disconnecting") {
				timerInfo.connectStatus = "ppp_disconnecting";
			} else if (data.ppp_status == "ppp_disconnected") {
				removeCallback(checkDisconnectStatus);
				timerInfo.connectStatus = "ppp_disconnected";
				callback({
					result : true,
					status : timerInfo.connectStatus
				});
			} else if(new Date().getTime() - checkPoint < 1e4){
                timerInfo.connectStatus = "ppp_disconnecting";
            } else {
                removeCallback(checkDisconnectStatus);
                callback({
                    result : false
                });
            }
		}
	}

    /**
     * 获取apn信息
     * @method getApnSettings
     * @return {Object} JSON
     * @example
      //返回结果格式
		{
	    	APNs : result.APN_config0 + "||" + result.APN_config1 + "||" + result.APN_config2 + "||" + result.APN_config3 + "||" + result.APN_config4 + "||" + result.APN_config5 + "||" + result.APN_config6 + "||" + result.APN_config7 + "||" + result.APN_config8 + "||" + result.APN_config9,
			ipv6APNs : result.ipv6_APN_config0 + "||" + result.ipv6_APN_config1 + "||" + result.ipv6_APN_config2 + "||" + result.ipv6_APN_config3 + "||" + result.ipv6_APN_config4 + "||" + result.ipv6_APN_config5 + "||" + result.ipv6_APN_config6 + "||" + result.ipv6_APN_config7 + "||" + result.ipv6_APN_config8 + "||" + result.ipv6_APN_config9,
			apnMode : result.apn_mode,
			profileName :  result.m_profile_name || result.profile_name,
			wanDial : result.wan_dial,
			pdpType : result.pdp_type,
			pdpSelect : result.pdp_select,
			index : result.index,
			currIndex : result.Current_index,
			autoApns : result.apn_auto_config,
			wanApn : result.wan_apn,
			authMode : result.ppp_auth_mode,
			username : result.ppp_username,
			password : result.ppp_passwd,
			wanApnV6 : result.ipv6_wan_apn,
			authModeV6 : result.ipv6_ppp_auth_mode,
			usernameV6 : result.ipv6_ppp_username,
			passwordV6 : result.ipv6_ppp_passwd
    	}
     *
     */
    function getApnSettings() {

    	return doStuff(arguments, {}, prepare, deal, null, false);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.isTest = isTest;
			requestParams.cmd = "hide_net_3G_search_mode,APN_config0,APN_config1,APN_config2,APN_config3,APN_config4,APN_config5,APN_config6,APN_config7,APN_config8,APN_config9," +
								"APN_config10,APN_config11,APN_config12,APN_config13,APN_config14,APN_config15,APN_config16,APN_config17,APN_config18,APN_config19," +
								"ipv6_APN_config0,ipv6_APN_config1,ipv6_APN_config2,ipv6_APN_config3,ipv6_APN_config4,ipv6_APN_config5,ipv6_APN_config6,ipv6_APN_config7,ipv6_APN_config8,ipv6_APN_config9," +
								"ipv6_APN_config10,ipv6_APN_config11,ipv6_APN_config12,ipv6_APN_config13,ipv6_APN_config14,ipv6_APN_config15,ipv6_APN_config16,ipv6_APN_config17,ipv6_APN_config18,ipv6_APN_config19," +
								"m_profile_name,profile_name,wan_dial,pdp_type,pdp_select,index,Current_index,apn_auto_config,ipv6_apn_auto_config," +
								"apn_mode,wan_apn,ppp_auth_mode,ppp_username,ppp_passwd,ppp_passtmp," +
								"ipv6_wan_apn,ipv6_pdp_type,ipv6_ppp_auth_mode,ipv6_ppp_username,ipv6_ppp_passwd,ipv6_ppp_passtmp,apn_num_preset";
			requestParams.multi_data = 1;
			return requestParams;
		}

		function deal(result) {
			if (result) {
				return {
					APNs : result.APN_config0 + "||" + result.APN_config1 + "||" + result.APN_config2 + "||" + result.APN_config3 + "||" + result.APN_config4 + "||"
							+ result.APN_config5 + "||" + result.APN_config6 + "||" + result.APN_config7 + "||" + result.APN_config8 + "||" + result.APN_config9 + "||"
							+ result.APN_config10 + "||" + result.APN_config11 + "||" + result.APN_config12 + "||" + result.APN_config13 + "||" + result.APN_config14 + "||"
							+ result.APN_config15 + "||" + result.APN_config16 + "||" + result.APN_config17 + "||" + result.APN_config18 + "||" + result.APN_config19,
					ipv6APNs : result.ipv6_APN_config0 + "||" + result.ipv6_APN_config1 + "||" + result.ipv6_APN_config2 + "||" + result.ipv6_APN_config3 + "||" + result.ipv6_APN_config4 + "||"
							+ result.ipv6_APN_config5 + "||" + result.ipv6_APN_config6 + "||" + result.ipv6_APN_config7 + "||" + result.ipv6_APN_config8 + "||" + result.ipv6_APN_config9 + "||"
							+ result.ipv6_APN_config10 + "||" + result.ipv6_APN_config11 + "||" + result.ipv6_APN_config12 + "||" + result.ipv6_APN_config13 + "||" + result.ipv6_APN_config14 + "||"
							+ result.ipv6_APN_config15 + "||" + result.ipv6_APN_config16 + "||" + result.ipv6_APN_config17 + "||" + result.ipv6_APN_config18 + "||" + result.ipv6_APN_config19,
					apnMode : result.apn_mode,
					profileName :  result.m_profile_name || result.profile_name,
					wanDial : result.wan_dial,
					pdpType : result.pdp_type == 'IP' ? 'IP' : result.ipv6_pdp_type,
					pdpSelect : result.pdp_select,
					index : result.index,
					currIndex : result.Current_index,
					autoApns : result.apn_auto_config,
					autoApnsV6 : result.ipv6_apn_auto_config,
					wanApn : result.wan_apn,
					authMode : result.ppp_auth_mode.toLowerCase(),
					username : result.pdp_type == 'IP' ? result.ppp_username : result.ipv6_ppp_username,
					//password : result.ppp_passwd,
					password : result.ppp_passtmp,
					dnsMode : "",
					dns1 : "",
					dns2 : "",
					wanApnV6 : result.ipv6_wan_apn,
					authModeV6 : result.ipv6_ppp_auth_mode.toLowerCase(),
					usernameV6 : result.ipv6_ppp_username,
					//passwordV6 : result.ipv6_ppp_passwd,
					passwordV6 : result.ipv6_ppp_passtmp,
					dnsModeV6 : "",
					dns1V6 : "",
					dns2V6 : "",
                    apnNumPreset: result.apn_num_preset,
                    hide_net_3G_search_mode: result.hide_net_3G_search_mode
				};
			} else {
				return {
					result : false
				};
			}
		}
    }

    /**
     * 根据profile name删除apn信息
     * @method deleteApn
     * @return {Object} JSON resultObject
     * @example
      //请求参数映射
		{
			goformId : "APN_PROC_EX",
			apn_action : "delete",
			apn_mode : "manual",
			index : params.index
		}
     */
    function deleteApn(){
    	return doStuff(arguments, {}, prepare, deal, null, true);

    	function prepare(params, isPost) {
    		var requestParams = {
				isTest : isTest,
				apn_action : "delete",
				apn_mode : "manual",
				index : params.index
    		};
    		requestParams.goformId = "APN_PROC_EX";
    		return requestParams;
		}

		function deal(data) {
			if (data.result == "success") {
				return {
					result : true
				};
			} else {
				return {
					result : false
				};
			}
		}
    }

    /**
     * 设置默认APN
     * @method setDefaultApn
     * @return {Object} JSON resultObject
     * @example
      //请求参数映射
		{
			goformId : "APN_PROC_EX", //"APN_PROC",
			apn_action : "set_default",
			//0(新增并且设置默认，或者编辑后设置默认)/1（选择已经保存过的，直接设置默认）
			//目前只支持1。当传0时，需要将save时的参数一并传下
			set_default_flag : "1",
			pdp_type : params.pdpType, //IP/IPv6/IPv4v6
			index : params.index,
			apn_mode : 'manual'
		}
     */
    function setDefaultApn(){
    	return doStuff(arguments, {}, prepare, deal, null, true);

    	function prepare(params, isPost) {
    		var requestParam = {
    				isTest : isTest,
    				goformId : "APN_PROC_EX", //"APN_PROC",
    				apn_mode : params.apnMode
    		};
    		if(params.apnMode == 'manual'){
    			requestParam.apn_action = "set_default";
    				//0(新增并且设置默认，或者编辑后设置默认)/1（选择已经保存过的，直接设置默认）
    				//目前只支持1。当传0时，需要将save时的参数一并传下
    			requestParam.set_default_flag = "1";
    			requestParam.pdp_type = params.pdpType; //IP/IPv6/IPv4v6
    			requestParam.index = params.index;
    		}
    		return requestParam;
		}

		function deal(data) {
			if (data.result == "success") {
				return {
					result : true
				};
			} else {
				return {
					result : false
				};
			}
		}
    }

    /**
     * 新增APN
     * @method addOrEditApn
     * @return {Object} JSON resultObject
     */
    function addOrEditApn(){
    	return doStuff(arguments, {}, prepare, deal, null, true);

    	function prepare(params, isPost) {
    		var requestParams = {
    					isTest : isTest,
    					goformId : "APN_PROC_EX",
    					apn_action : "save",
    					apn_mode : "manual",
    					profile_name : params.profileName,
    					wan_dial : '*99#',
    					pdp_type: params.pdpType,//IP/IPv6/IPv4v6
    					pdp_select: 'auto',
    					index : params.index
    		};
    		if(params.pdpType == "IP"){
    				$.extend(requestParams, {
    					wan_apn : params.wanApn,
    					ppp_auth_mode : params.authMode,
    					ppp_username : params.username,
                                        ppp_passtmp : params.password,
    					//ppp_passwd : params.password,
    					//dns_mode : params.dnsMode,
    					//prefer_dns_manual : params.dns1,
    					//standby_dns_manual : params.dns2
    				});
    		}else if(params.pdpType == "IPv6"){
    				$.extend(requestParams, {
    					ipv6_wan_apn : params.wanApnV6,
    					ipv6_ppp_auth_mode : params.authModeV6,
    					ipv6_ppp_username : params.usernameV6,
					ipv6_ppp_passtmp : params.passwordV6
    					//ipv6_ppp_passwd : params.passwordV6
    					//ipv6_dns_mode : params.dnsModeV6,
    					//ipv6_prefer_dns_manual : params.dns1V6,
    					//ipv6_standby_dns_manual : params.dns2V6
    				});
    		}else{//"IPv4v6"
    				$.extend(requestParams, {
    					wan_apn : params.wanApn,
    					ppp_auth_mode : params.authMode,
    					ppp_username : params.username,
    					//ppp_passwd : params.password,
					ppp_passtmp : params.password,
    					dns_mode : params.dnsMode,
    					prefer_dns_manual : params.dns1,
    					standby_dns_manual : params.dns2,
    					ipv6_wan_apn : params.wanApnV6,
    					ipv6_ppp_auth_mode : params.authModeV6,
    					ipv6_ppp_username : params.usernameV6,
					ipv6_ppp_passtmp : params.passwordV6
    					//ipv6_ppp_passwd : params.passwordV6
    					//ipv6_dns_mode : params.dnsModeV6,
    					//ipv6_prefer_dns_manual : params.dns1V6,
    					//ipv6_standby_dns_manual : params.dns2V6
    				});
    		}
    		return requestParams;
		}

		function deal(data) {
			if (data.result == "success") {
				return {
					result : true
				};
			} else {
				return {
					result : false
				};
			}
		}
    }

    /**
     * 定时刷新获取的参数列表
	 * @attribute {Array} timerQueryString
	 */
    var timerQueryString = [ "modem_main_state", "user_web_disp_internet_ussd","pin_status","blc_wan_mode","blc_wan_auto_mode","loginfo","fota_new_version_state","fota_current_upgrade_state","fota_upgrade_selector","network_provider","is_mandatory","sta_count", "m_sta_count"];
    var loginTimerQueryString = ["signalbar","network_type", "sub_network_type",
        "ppp_status","rj45_state","EX_SSID1","sta_ip_status","EX_wifi_profile","m_ssid_enable", "wifi_cur_state", "SSID1",
        "simcard_roam", "lan_ipaddr", "battery_charging","telecomProviderSwitch", "battery_vol_percent", "battery_pers","spn_name_data","spn_b1_flag","spn_b2_flag",
        "realtime_tx_bytes","realtime_rx_bytes","realtime_time","realtime_tx_thrpt","realtime_rx_thrpt",
        "monthly_rx_bytes","monthly_tx_bytes","traffic_alined_delta","monthly_time","date_month","data_volume_limit_switch",
	"data_volume_limit_size","data_volume_alert_percent","data_volume_limit_unit","roam_setting_option","upg_roam_switch","fota_package_already_download",
    'ssid', 'dial_mode','ethwan_mode','default_wan_name'];
    if(config.HAS_SMS){
        $.merge(loginTimerQueryString, ["sms_received_flag", "sts_received_flag", 'sms_unread_num']);
    }
    /**
     * 定时刷新临时回调列表
	 * @attribute {Array} timerCallbackStack
	 */
    var timerCallbackStack = [];

    /**
     * 定时刷新回调列表
	 * @attribute {Array} timerCallbacks
	 */
	var timerCallbacks = [ timerUpdateStatus ];

	/**
	 * 定时刷新器。成功获取到数据以后将遍历回调列表
	 * @method timerUpdater
	 */
    function timerUpdater() {
        if (!timerUpdaterEnable){
			setTimeout(function(){timerUpdater();}, 1000);
			return;
		}
        var queryParams = checkTimerUpdaterParameters();
        asyncRequest(queryParams, function (data) {
            for (var i = 0; i < timerCallbacks.length; i++) {
                if (typeof timerCallbacks[i] === "function") {
                    timerCallbacks[i](data);
                }
            }
            $.merge(timerCallbacks, timerCallbackStack);
            timerCallbackStack = [];
            setTimeout(function(){timerUpdater();}, 1000);
        }, function () {
        	timerUpdaterErrorCallback();
            setTimeout(function(){timerUpdater();}, 1000);
        }, false);
    }

    /**
     * 检查定时器参数，在未登录前不进行瞬时状态查询
     * @method checkTimerUpdaterParameters
     */
    function checkTimerUpdaterParameters() {
        var queryParams = {
            multi_data:1,
            isTest:isTest
        };
        if (window.location.hash && window.location.hash != '#login' && timerInfo.isLoggedIn) {
            if(config.HAS_SMS){
                queryParams.sms_received_flag_flag = 0;
                queryParams.sts_received_flag_flag = 0;
            }
            if (loginTimerQueryString.length > 0 && _.indexOf(timerQueryString, loginTimerQueryString[0]) == -1) {
                $.each(loginTimerQueryString, function(i, n){
                    timerQueryString.push(n);
                });
            }
        } else {
            if (loginTimerQueryString.length > 0 && _.indexOf(timerQueryString, loginTimerQueryString[0]) != -1) {
                timerQueryString = _.without(timerQueryString, loginTimerQueryString);
            }
        }
        queryParams.cmd = timerQueryString.join(",");
        return queryParams;
    }

	/**
	 * 增加定时刷新参数及回调
	 * @method addTimerThings
	 * @param {Array || String} querys 查询key
	 * @param {Function} cb callback
	 */
	function addTimerThings(querys, cb) {
		if (_.isArray(querys)) {
			for ( var i = 0; i < querys.length; i++) {
				addQueryString(querys[i]);
			}
		} else {
			addQueryString(querys);
		}
		addCallback(cb);
	}

	/**
	 * 删除定时刷新参数及回调
	 * @method removeTimerThings
	 * @param {Array || String} querys 查询key
	 * @param {Function} cb
	 */
	function removeTimerThings(querys, cb) {
		if (_.isArray(querys)) {
			for ( var i = 0; i < querys.length; i++) {
				removeQueryString(querys[i]);
			}
		} else {
			removeQueryString(querys);
		}
		removeCallback(cb);
	}

	/**
	 * 增加定时刷新回调
	 * @method addCallback
	 * @param {Function} cb
	 */
	function addCallback(cb) {
		if (_.indexOf(timerCallbackStack, cb) == -1) {
			timerCallbackStack.push(cb);
		}
	}

	/**
	 * 删除定时刷新回调
	 * @method removeCallback
	 * @param {Function} cb
	 */
	function removeCallback(cb) {
		timerCallbacks = _.without(timerCallbacks, cb);
        if(timerCallbacks.length == 0){
            timerCallbacks.push(timerUpdateStatus);
        }
		return timerCallbackStack;
	}

	/**
	 * 增加定时刷新参数
	 * @method addQueryString
	 * @param {String} query 查询key
	 */
	function addQueryString(query) {
		if (_.indexOf(timerQueryString, query) == -1) {
			timerQueryString.push(query);
		}
	}

	/**
	 * 删除定时刷新回调
	 * @method removeQueryString
	 * @param {String} query
	 */
	function removeQueryString(query) {
		timerQueryString = _.without(timerQueryString, query);
		return timerQueryString;
	}

	/**
	 * 定时刷新默认状态更新回调函数
	 * @method timerUpdateStatus
	 * @param {Object} JSON data 定时刷新返回的结果集
	 */
    function timerUpdateStatus(data) {
        timerInfo.telecomProviderSwitch = data.telecomProviderSwitch;
        timerInfo.user_web_disp_internet_ussd = data.user_web_disp_internet_ussd;
		timerInfo.defaultWanName = data.default_wan_name;
        timerInfo.signalImg = typeof data.signalbar == 'undefined' ? '0' : data.signalbar;
        timerInfo.networkType = data.sub_network_type ? data.sub_network_type : (data.network_type ? data.network_type : '');
        if (timerInfo.networkType.toLowerCase().indexOf("limited_service") != -1 || timerInfo.networkType.toLowerCase().indexOf("limited service") != -1) {
            timerInfo.networkType = "limited_service";
        } else if (timerInfo.networkType.toLowerCase().indexOf("no_service") != -1 || timerInfo.networkType.toLowerCase().indexOf("no service") != -1) {
            timerInfo.networkType = "no_service";
        }
        timerInfo.networkOperator = data.network_provider ? data.network_provider : '';
        timerInfo.spn_b1_flag = data.spn_b1_flag;
        timerInfo.spn_b2_flag = data.spn_b2_flag;
        timerInfo.spn_name_data = data.spn_name_data;
        timerInfo.connectStatus = typeof data.ppp_status == 'undefined'? 'ppp_disconnected' : data.ppp_status;
		timerInfo.rj45ConnectStatus = (typeof data.rj45_state == 'undefined' || data.rj45_state == '')? 'dead' : data.rj45_state;
		timerInfo.ethWanMode = data.ethwan_mode;
        timerInfo.ssid1AttachedNum = data.sta_count == "" ? 0 : parseInt(data.sta_count,10);
		timerInfo.ssid2AttachedNum = data.m_sta_count == ""  ? 0 : parseInt(data.m_sta_count,10);
        timerInfo.roamingStatus = getRoamStatus(timerInfo.networkType, data.modem_main_state, data.simcard_roam);
        timerInfo.wifiStatus = data.wifi_cur_state == "1";
        timerInfo.simStatus = data.modem_main_state;
        timerInfo.pinStatus = data.pin_status;
        //TODO 电池续航时间需要再讨论，下边是92的代码
        var needMinutes = 3 * 60 * 60;
        var batteryLevel = (data.battery_vol_percent && data.battery_vol_percent.length > 0) ? data.battery_vol_percent : 100;
        timerInfo.batteryPers = data.battery_pers;
        var remainMinutes = Math.round(needMinutes * (1 - batteryLevel / 100));
        timerInfo.batteryStatus = (typeof data.battery_charging == 'undefined') ? '0' : data.battery_charging;
        timerInfo.batteryLevel = batteryLevel;
        timerInfo.batteryTime = remainMinutes.toString();
        timerInfo.data_counter = {
            uploadRate: data.realtime_tx_thrpt == '' ? 0 : data.realtime_tx_thrpt,
            downloadRate: data.realtime_rx_thrpt == '' ? 0 : data.realtime_rx_thrpt,
            currentSent: data.realtime_tx_bytes == '' ? 0 : data.realtime_tx_bytes,
            currentReceived: data.realtime_rx_bytes == '' ? 0 : data.realtime_rx_bytes,
            currentConnectedTime: data.realtime_time == '' ? 0 : data.realtime_time,
            monthlySent: data.monthly_tx_bytes == '' ? 0 : data.monthly_tx_bytes,
            monthlyReceived: data.monthly_rx_bytes == '' ? 0 : data.monthly_rx_bytes,
			traffic_alined_delta: data.traffic_alined_delta = '' ? 0 : data.traffic_alined_delta,
            monthlyConnectedTime: data.monthly_time == '' ? 0 : data.monthly_time,
            month: data.date_month == '' ? 1 : data.date_month
        };
        timerInfo.ssid = data.SSID1;
        timerInfo.authMode = data.AuthMode;
        timerInfo.isLoggedIn = config.HAS_LOGIN ? data.loginfo == "ok" : true;
        if (config.HAS_SMS) {
            if (!timerInfo.newSmsReceived) {
                timerInfo.newSmsReceived = data.sms_received_flag > 0;
            }
            if (!timerInfo.smsReportReceived) {
                timerInfo.smsReportReceived = data.sts_received_flag > 0;
            }
            if (typeof data.sms_dev_unread_num != "undefined") {
                timerInfo.smsUnreadCount = config.SMS_UNREAD_NUM_INCLUDE_SIM ? parseInt(data.sms_dev_unread_num | 0, 10) + parseInt(data.sms_sim_unread_num | 0, 10) : parseInt(data.sms_dev_unread_num | 0, 10);
            } else {
                timerInfo.smsUnreadCount = parseInt(data.sms_unread_num | 0, 10)
            }
        }
        if (data.data_volume_limit_switch == '1') {
            timerInfo.limitVolumeEnable = true;
            timerInfo.limitVolumeType = data.data_volume_limit_unit == 'data' ? '1' : '0';
            timerInfo.limitVolumePercent = data.data_volume_alert_percent;
            if (data.data_volume_limit_unit == 'data') {
                var dataMonthLimit = data.data_volume_limit_size.split("_");
                timerInfo.limitVolumeSize = dataMonthLimit[0] * dataMonthLimit[1] * 1024 * 1024;
            } else {
                timerInfo.limitVolumeSize = data.data_volume_limit_size * 60 * 60;
            }
        } else {
        	timerInfo.limitVolumeEnable = false;
        	timerInfo.limitVolumeType = '1';
        	timerInfo.limitVolumePercent = '100';
        	timerInfo.limitVolumeSize = '0';
        }
        timerInfo.connectWifiProfile = data.EX_wifi_profile;
        timerInfo.connectWifiSSID = data.EX_SSID1;
        timerInfo.connectWifiStatus = data.sta_ip_status;
        timerInfo.multi_ssid_enable = data.m_ssid_enable;
        timerInfo.roamMode = data.roam_setting_option;
        if(data.blc_wan_mode == "AUTO"){
			timerInfo.blc_wan_mode = data.blc_wan_auto_mode ? data.blc_wan_auto_mode : 'AUTO_PPP';
		} else{
			timerInfo.blc_wan_mode = data.blc_wan_mode ? data.blc_wan_mode : 'PPP';
		}
		// TODO OTA
        timerInfo.new_version_state = data.fota_new_version_state == "has_critical" || data.fota_new_version_state == "has_optional"|| data.fota_new_version_state == "already_has_pkg";
        timerInfo.current_upgrade_state = data.fota_current_upgrade_state;
        if (timerInfo.current_upgrade_state == "verify_failed") {
            timerInfo.current_upgrade_state = "upgrade_pack_error";
        }
        timerInfo.fota_user_selector = data.fota_upgrade_selector;
        // TODO OTA
        timerInfo.is_mandatory = data.is_mandatory == "1" || data.fota_new_version_state == "has_critical";
        timerInfo.allowRoamingUpdate = data.upg_roam_switch;
		timerInfo.dialMode = data.dial_mode;
        timerInfo.fota_package_already_download = data.fota_package_already_download;
    }

    function timerUpdaterErrorCallback(){
    	timerInfo.batteryStatus = '0';
    }
    /**
     * 获取漫游状态, 参考MF93
     * @method getRoamStatus
	 * @return true 漫游状态  false 非漫游状态
     */
    function getRoamStatus(networkType, modemState, simcardRoam) {
        if(("" == $.trim(networkType)) || "no_service" == networkType.toLowerCase() || "limited_service" == networkType.toLowerCase() || "modem_sim_undetected" == modemState ||"modem_waitpin" == modemState || "modem_waitpuk" == modemState){
            return false;
        }

        if ("Internal" == simcardRoam || "International" == simcardRoam){
            return true;
        }else{
            return false;
        }
    }


	$(document).ready(function() {
        setTimeout(function () {
            timerUpdater();
        }, config.IS_TEST ? 1000 : 0);
	});

	/**************************************************************************
     Description : set current network
	 Parameters :
	 [IN] : string   : strNetworkNumber : the network digital number MCCMNC.
	 [IN] : number   : nRat : the network connect technology: 0 = "2G", 2 = "3G".
	 [IN] : function : callback(bResult) : call back function, and the parameters list below:
	 [IN] : bool : bResult : true = succeed, false = failed.
	 return : bool : if the parameters is invalid, the function will return false, otherwise will return true.
	 comment: we need another parameter nRat, the value may be: 0 = '2G' or 2 = '3G'.
     @method setNetwork
	 **************************************************************************/
	function setNetwork(strNetworkNumber, nRat, nSubAct,callback) {
        if((typeof(strNetworkNumber) !== "string") || (strNetworkNumber === "") ||
            (typeof(nRat) !== "number") || (isNaN(nRat))) {
            if(typeof(callback) === "function") {
                callback(false);//VDF null
                return;
            }
        }
        var nRat1 = -1;
        if(nRat === 0) {
            nRat1 = 0;
        } else if(nRat === 2) {
            nRat1 = 2;
        } else if(nRat == 7) {
            nRat1 = 7;
        } else {
            nRat1 = -1;
        }
        if(-1 === nRat1) {
            if(typeof(callback) === "function") {
                callback(false);//VDF null
                return;
            }
        }
		var SubAct;
		if(nSubAct.toString() == "NaN"){SubAct = "";}
		else{SubAct = nSubAct;}
        asyncRequest({
            isTest: isTest,
            goformId: "SET_NETWORK",
            NetworkNumber: strNetworkNumber,
            Rat: nRat,
			nSubrat:SubAct
        }, function (data) {
            if (data && data.result == "success") {
                var flag;
                var counter = 0;
                var timer = setInterval(function () {
                    var obj = syncRequest({cmd: 'm_netselect_result', isTest: isTest}, false);
                    if (!obj) {
                        callback(false);
                    }
                    //after 60s,if the flag is empty,it means that setNetwork fail
                    if (obj.m_netselect_result == "manual_success") {
                        flag = "1";
                        window.clearInterval(timer);
                        callback(true);
                    } else if (obj.m_netselect_result == "manual_fail") {
                        flag = "0";
                        window.clearInterval(timer);
                        callback(false);
                    } else if (counter < 120) {
                        counter++;
                    } else {
                        window.clearInterval(timer);
                        callback(false);
                    }
                }, 1000);
            } else {
                callback(false);
            }
        }, function (data) {
            callback(false);
        }, true);
	}


    /**
     * 保存一条电话本
     * @method savePhoneBook
     * @param {Object} JSON
     * @example
     * //请求参数映射
     * {
     *  location = 0;
     *  name = "张三";
     *  mobile_phone_number = "13500000015";
     *  home_phone_number = "012-12345678";
     *  office_phone_number = "012-87654321";
     *  mail = "mail@mail.com";
     * }
     * @return {Object} JSON
     */
    function savePhoneBook() {
        var callback = arguments[1];
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.notCallback = true;
            requestParams.goformId = "PBM_CONTACT_ADD";
            requestParams.location = params.location;
            requestParams.name = encodeMessage(params.name);
            requestParams.mobilephone_num = params.mobile_phone_number;
            if (requestParams.location == 1) {
                requestParams.add_index_pc = params.index;
                requestParams.homephone_num = params.home_phone_number;
                requestParams.officephone_num = params.office_phone_number;
                requestParams.email = encodeMessage(params.mail);
                requestParams.groupchoose = params.group;
                if(!requestParams.groupchoose){
                    requestParams.groupchoose = "common";
                }
            } else {
                requestParams.edit_index = params.index;
            }
			if(params.delId != undefined){
				requestParams.delId = params.delId;
			}
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                addTimerThings("pbm_write_flag", checkSavePhoneBook);
            } else {
                callback(data);
            }
        }

        function checkSavePhoneBook(data){
            checkPbmWriteFlag(data, callback, checkSavePhoneBook);
        }
    }

    function checkPbmWriteFlag(data, callback, fn) {
        if (data.pbm_write_flag == "0") {
            removeTimerThings("pbm_write_flag", fn);
            callback({result:"success"});
        } else if (data.pbm_write_flag == "6" || data.pbm_write_flag == "7" || data.pbm_write_flag == "8" || data.pbm_write_flag == "9"|| data.pbm_write_flag == "10"|| data.pbm_write_flag == "11"|| data.pbm_write_flag == "14") {
            removeTimerThings("pbm_write_flag", fn);
            callback({result:"fail"});
        } else {
          //noting to do,continue waiting
        }
    }

    /**
     * 删除电话本
     * @method deletePhoneBooks
     * @param {Object} JSON
     * @example
     * //请求参数映射
     * {
     *  indexs:["1","2","3"]
     * }
     * @return {Object} JSON
     */
    function deletePhoneBooks() {
        var callback = arguments[1];
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.notCallback = true;
            requestParams.goformId = "PBM_CONTACT_DEL";
            requestParams.del_option = "delete_num";
            requestParams.delete_id = params.indexs.join(",");
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                addTimerThings("pbm_write_flag", checkDeletePhoneBooks);
            } else {
                callback(data);
            }
        }

        function checkDeletePhoneBooks(data){
            checkPbmWriteFlag(data, callback, checkDeletePhoneBooks);
        }
    }

    /**
     * 删除所有电话本数据
     * @method deleteAllPhoneBooks
     * @param {Object} JSON
     * @example
     * //请求参数映射
     * {
     *   location:0
     * }
     * @return {Object} JSON
     */
    function deleteAllPhoneBooks() {
        var callback = arguments[1];
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.notCallback = true;
            requestParams.goformId = "PBM_CONTACT_DEL";
            requestParams.del_option = "delete_all";
            requestParams.del_all_location = params.location;
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                addTimerThings("pbm_write_flag", checkDeleteAllPhoneBooks);
            } else {
                callback(data);
            }
        }

        function checkDeleteAllPhoneBooks(data){
            checkPbmWriteFlag(data, callback, checkDeleteAllPhoneBooks);
        }
    }

    /**
     * 按分组删除所有电话本数据
     * @method deleteAllPhoneBooksByGroup
     * @param {Object} JSON
     * @example
     * //请求参数映射
     * {
     *   del_group:'common'
     * }
     * @return {Object} JSON
     */
    function deleteAllPhoneBooksByGroup() {
        var callback = arguments[1];
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.notCallback = true;
            requestParams.goformId = "PBM_CONTACT_DEL";
            requestParams.del_option = "delete_all_by_group";
            requestParams.del_all_location = 3;
            requestParams.del_group = params.group;
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                addTimerThings("pbm_write_flag", checkDeleteAllPhoneBooksByGroup);
            } else {
                callback(data);
            }
        }

        function checkDeleteAllPhoneBooksByGroup(data){
            checkPbmWriteFlag(data, callback, checkDeleteAllPhoneBooksByGroup);
        }
    }

	/**
     * 设置拨号模式
     * @method setConnectionMode
     * @param {Object} JSON
     * @return success/failure
     */
    function setConnectionMode() {
    	return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.goformId = "SET_CONNECTION_MODE";
			requestParams.isTest = isTest;
			requestParams.ConnectionMode = params.connectionMode;
            requestParams.roam_setting_option = params.isAllowedRoaming;
			return requestParams;
		}

		function deal(data) {
			if (data) {
				return data;
			} else {
                callback(data);
			}
		}
    }

    /**
     * 读取当前拨号模式
     * @method getConnectionMode
     * @return {Object} JSON
     */
    function getConnectionMode() {
    	return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
        	var requestParams = {};
			requestParams.isTest = isTest;
        	requestParams.cmd = "ConnectionMode";
        	return requestParams;
        }

        function deal(data) {
        	if (data) {
        		var result = {};
        		result.connectionMode = data.connectionMode;
                result.isAllowedRoaming = data.autoConnectWhenRoaming;
        		return result;
        	} else {
        		return unknownErrorObject;
        	}
        }
    }
    function getDisplay() {
		return doStuff(arguments, {}, prepare, deal, null, false);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.isTest = isTest;
			requestParams.cmd = "hide_net_3G_search_mode,cpin,netlock_display,has_battery";
			requestParams.multi_data = "1";
			return requestParams;
		}

		function deal(data) {
			if (data) {
				var result = {};
				result.cpin = data.cpin;
				result.hide_net_3G_search_mode = data.hide_net_3G_search_mode;
				result.netlock_display = data.netlock_display;
				result.has_battery = data.has_battery;
				return result;
			} else {
				return unknownErrorObject;
			}
		}

	}

    function _getPhoneBooks(args, location) {
        if (args[0].data_per_page == 0) {
            return {"pbm_data":[]};
        }
        return doStuff(args, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.mem_store = location;
            if (location == 2) {
                requestParams.cmd = "pbm_data_total";
            } else {
                requestParams.cmd = "pbm_data_info";
            }
            requestParams.page = params.page;
            requestParams.data_per_page = params.data_per_page;
            requestParams.orderBy = params.orderBy;
            requestParams.isAsc = params.isAsc;
            return requestParams;
        }

        function deal(data) {
            if (data && data.pbm_data) {
                var books = [];
                $.each(data.pbm_data, function (i) {
                    books.push({
                        pbm_id:data.pbm_data[i].pbm_id,
                        pbm_location:data.pbm_data[i].pbm_location,
                        pbm_number:data.pbm_data[i].pbm_number,
                        pbm_anr:data.pbm_data[i].pbm_anr,
                        pbm_anr1:data.pbm_data[i].pbm_anr1,
                        pbm_group:data.pbm_data[i].pbm_group,
                        pbm_name:decodeMessage(data.pbm_data[i].pbm_name),
                        pbm_email:decodeMessage(data.pbm_data[i].pbm_email)
                    });
                });
                return {pbm_data:books};
            } else {
                return unknownErrorObject;
            }
        }
    }
    /**
     * 按分组获取设备侧电话本数据
     * @method getPhoneBooksByGroup
     * @return {Object} JSON
     */
    function getPhoneBooksByGroup() {
        if (arguments[0].data_per_page == 0) {
            return {"pbm_data":[]};
        }
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "pbm_data_total";
            requestParams.mem_store = 3;
            requestParams.pbm_group = params.group;
            requestParams.page = params.page;
            requestParams.data_per_page = params.data_per_page;
            requestParams.orderBy = params.orderBy;
            requestParams.isAsc = params.isAsc;
            return requestParams;
        }

        function deal(data) {
            if (data && data.pbm_data) {
                var books = [];
                $.each(data.pbm_data, function (i) {
                    books.push({
                        pbm_id:data.pbm_data[i].pbm_id,
                        pbm_location:data.pbm_data[i].pbm_location,
                        pbm_number:data.pbm_data[i].pbm_number,
                        pbm_anr:data.pbm_data[i].pbm_anr,
                        pbm_anr1:data.pbm_data[i].pbm_anr1,
                        pbm_group:data.pbm_data[i].pbm_group,
                        pbm_name:decodeMessage(data.pbm_data[i].pbm_name),
                        pbm_email:decodeMessage(data.pbm_data[i].pbm_email)
                    });
                });
                return {pbm_data:books};
            } else {
                return unknownErrorObject;
            }
        }
    }
    /**
     * 获取设备侧电话本数据
     * @method getDevicePhoneBooks
     * @return {Object} JSON
     */
    function getDevicePhoneBooks() {
        return _getPhoneBooks(arguments, 1);
    }

    /**
     * 获取SIM卡侧电话本数据
     * @method getSIMPhoneBooks
     * @return {Object} JSON
     */
    function getSIMPhoneBooks() {
        return _getPhoneBooks(arguments, 0);
    }

    /**
     * 获取电话本数据,包括SIM卡和设备侧
     * @method getPhoneBooks
     * @return {Object} JSON
     */
    function getPhoneBooks() {
        return _getPhoneBooks(arguments, 2);
    }

    function getPhoneBookReady(){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "pbm_init_flag";
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

	/**
     * 获取电话本容量信息,包括SIM卡和设备侧
     * @method getPhoneBookCapacity
     * @return {Object} JSON
     */
    function getPhoneBookCapacity(args, isSIM) {
        return doStuff(args, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "pbm_capacity_info";
            if (isSIM) {
                requestParams.pbm_location = "pbm_sim";
            } else {
                requestParams.pbm_location = "pbm_native";
            }
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取SIM卡侧电话本容量
     * @method getSIMPhoneBookCapacity
     * @return {Object} JSON
     * @example
      //请求参数映射
     {
         simPbmTotalCapacity:100,
         simPbmUsedCapacity:20,
         simType:?, //2G or 3G used to extend pbm
         maxNameLen:?,
         maxNumberLen:?
     }
     */
    function getSIMPhoneBookCapacity() {
        var data = getPhoneBookCapacity(arguments, true);
        return {
            simPbmTotalCapacity:parseInt(data.pbm_sim_max_record_num),
            simPbmUsedCapacity:parseInt(data.pbm_sim_used_record_num),
            simType:data.pbm_sim_type, //2G or 3G used to extend pbm
            maxNameLen:parseInt(data.pbm_sim_max_name_len),
            maxNumberLen:parseInt(data.pbm_sim_max_number_len) > 40 ? 40:parseInt(data.pbm_sim_max_number_len)
        };
    }

    /**
     * 获取设备电话本容量
     * @method getDevicePhoneBookCapacity
     * @return {Object} JSON
     * @example
      //返回结果
     {
         pcPbmTotalCapacity:100，
         pcPbmUsedCapacity:30
     }
     */
    function getDevicePhoneBookCapacity() {
        var data = getPhoneBookCapacity(arguments, false);
        return {
            pcPbmTotalCapacity:parseInt(data.pbm_dev_max_record_num),
            pcPbmUsedCapacity:parseInt(data.pbm_dev_used_record_num)
        };
    }

    /**
     * 获取登录相关信息
     * @method getLoginData
     * @return {Object} JSON
     */
    function getLoginData(){
        return doStuff(arguments, {}, prepare, deal, null, false);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.isTest = isTest;
			requestParams.cmd = "modem_main_state,puknumber,pinnumber,blc_wan_mode,blc_wan_auto_mode,psw_fail_num_str,login_lock_time";
			requestParams.multi_data = 1;
			return requestParams;
		}

        function deal(data) {
            if (data) {
				if(data.blc_wan_mode == "AUTO"){
					data.blc_wan_mode =  data.blc_wan_auto_mode ? data.blc_wan_auto_mode : 'AUTO_PPP';
				} else{
					data.blc_wan_mode =  data.blc_wan_mode ? data.blc_wan_mode : 'PPP';
				}
				data.psw_fail_num_str = data.psw_fail_num_str == '' ? config.MAX_LOGIN_COUNT : data.psw_fail_num_str;
				data.login_lock_time = data.login_lock_time == '' ? '300' : data.login_lock_time;
				return data;
			} else {
				return unknownErrorObject;
			}
		}
	}

    /**
     * 获取登录状态
     * @method login
     * @param {Object} JSON
     * @example
     * //返回结果格式
     *{
     *   password:"123456"
     *}
     * @return {Object} JSON
     */
    function login() {
        return doStuff(arguments, {}, prepare, deal, {errorType: 'badPassword'}, true);

        function prepare(params, isPost){
            var obj = {
	            isTest : isTest,
	            goformId : "LOGIN",
	            password : config.PASSWORD_ENCODE ? Base64.encode(params.password) : params.password,
	            username : config.PASSWORD_ENCODE ? Base64.encode(params.username) : params.username
            };
            return obj;
        }

        function deal(data){
            //in doc, notes:If the user is 'already logged in' at the device, it calls back as success.
            if(data && (data.result == "0" || data.result == "4")){
                timerInfo.isLoggedIn = true;
                return 	{result: true};
            }else{
                var loginError = {};
                switch(data.result){
                    case "1":
                        loginError = {errorType : "Login Fail"};
                        break;
                    case "2":
                        loginError = {errorType : "duplicateUser"};
                        break;
                    case "3":
                        loginError = {errorType : "badPassword"};
                        break;
                    case "5":
                        loginError = {errorType : "badUsername"};
                        break;
                    default :
                        loginError = {errorType : "Login Fail"};
                        break;
                }
                timerInfo.isLoggedIn = false;
                return $.extend(unknownErrorObject, loginError);
            }
        }
    }

    /**
     * 获取登录状态
     * @method getLoginStatus
     * @return {Object} JSON
     * @example
     //返回结果格式
     {
        status = "loggedIn";
     }
     */
    function getLoginStatus() {
        if(timerInfo.isLoggedIn != undefined){
            return doStuff(arguments, {
                status : timerInfo.isLoggedIn ? 'loggedIn' : 'loggedOut'
            });
        }else{
            var resultObject = {};
            if(!config.HAS_LOGIN){
                resultObject.status = 'loggedIn';
                resultObject.errorType = 'no_login';
                timerInfo.isLoggedIn = true;
            }
            return doStuff(arguments, resultObject, prepare, deal, null, false);
        }

        function prepare(params, isPost){
            var requestParams  = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "loginfo,hasBattery";
			requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data){
            if(data && (data.loginfo || data.loginfo == "")){
                var loginStatus = {};
                //it should be an enum rather than Boolean
                switch(data.loginfo){
                    case "ok":
                        timerInfo.isLoggedIn = true;
                        loginStatus.status = "loggedIn";
                        break;
                    default:
                        timerInfo.isLoggedIn = false;
                        loginStatus.status = "loggedOut";
                        break;
                }
                loginStatus["has_battery"] = data.has_battery
                return loginStatus;
            }else{
                timerInfo.isLoggedIn = undefined;
                return $.extend(unknownErrorObject, {errorType : "LoginStatusError"});
            }
        }
    }

    /**
     * 验证PIN输入是否正确
     * @method enterPIN
     * @param {Object} JSON 参数对象
     * @example
      //请求参数映射
     {
        PinNumber = "1234";
     }
     * @return {Object} JSON
     */
    function enterPIN() {
        return doStuff(arguments, {}, prepare, deal,{}, true);

        function prepare(params, isPost){
            var obj = {};
            obj.isTest = isTest;
            obj.goformId = "ENTER_PIN";
            obj.PinNumber = params.PinNumber;
            return obj;
        }

        function deal(data) {
            if (data && data.result === "success") {
                return { result:true };
            } else {
                return { result:false};
            }
        }
    }

    /**
     * 根据PUK设置新的PIN
     * @method enterPUK
     * @param {Object} JSON 参数对象
     * @example
      //请求参数映射
     {
         PUKNumber = "12345678";
         PinNumber = "1234";
     }
     * @return {Object} JSON
     */
    function enterPUK() {
        return doStuff(arguments, {}, prepare, deal,{}, true);

        function prepare(params, isPost){
            var obj = {};
            obj.isTest = isTest;
            obj.goformId = "ENTER_PUK";
            obj.PUKNumber = params.PUKNumber;
            obj.PinNumber = params.PinNumber;
            return obj;
        }

        function deal(data) {
            if (data && data.result === "success") {
                return { result:true };
            } else {
                return { result:false};
            }
        }
    }

    /**
     * 获取全部短消息
     * @method getSMSMessages
     * @example
      //请求参数映射

     */
    function getSMSMessages() {
		return doStuff(arguments, {}, prepare, deal, {}, false);

        function prepare(params, isPost) {
            var obj = {
				isTest : isTest,
				cmd : "sms_data_total",
				page : params.page,
                data_per_page: config.SMS_DATABASE_SORT_SUPPORT ? params.smsCount : 500,
				mem_store : params.nMessageStoreType,
				tags : params.tags,
				order_by : params.orderBy
			};
            return obj;
        }

		function deal(data) {
			if (data && data.messages && data.messages.length > 0) {
				return {messages: parseMessages(data.messages) };
			} else {
				return {messages: [] };
			}
		}
    }

    function parseMessages(messages, isReport){
    	var result = [];
    	for(var i = 0 ; i < messages.length; i++){
            if(!config.SHOW_UN_COMPLETE_CONCAT_SMS && typeof messages[i].received_all_concat_sms != "undefined" && messages[i].received_all_concat_sms == '0'){
                continue;
            }
    		var oneMessage = {};
    		oneMessage.id = messages[i].id;
    		oneMessage.number = messages[i].number;
    		oneMessage.content = isReport ? messages[i].content : decodeMessageContent(messages[i].content);
    		oneMessage.time = transTime('20' + messages[i].date);
    		oneMessage.isNew = messages[i].tag == "1";
			oneMessage.groupId = messages[i].draft_group_id;
    		oneMessage.tag = messages[i].tag;
            oneMessage.receivedAll = messages[i].received_all_concat_sms == '1';
    		result.push(oneMessage);
    	}
        if (!config.SMS_DATABASE_SORT_SUPPORT) {
            var ids = [];
            var tmpResult = [];
            for (var i = result.length; i--;) {
                var n = result[i];
                var idx = $.inArray(n.id, ids);
                if (idx == -1) {
                    ids.push(n.id);
                    tmpResult.push(n);
                } else {
                    if (n.content.length > tmpResult[idx].content.length) {
                        tmpResult[idx] = n;
                    }
                }
            }
            return _.sortBy(tmpResult, function (n) {
                return 0 - n.id;
            });
        } else {
            return result;
        }
    }

    function decodeMessageContent(msgContent) {
    	return decodeMessage(escapeMessage(msgContent));//.replace(/"/g, "\\\"");
    }

    /**
     * 发送短消息
     * @method sendSMS
     */
    function sendSMS() {
    	var callback = arguments[1];
    	var errorCabllback = arguments[2] ? arguments[2] : callback;
    	return doStuff(arguments, {}, prepare, deal, null, true);

    	function prepare(params, isPost){
            var obj = {
        		isTest : isTest,
        		goformId : "SEND_SMS",
        		notCallback : true,
    			Number : params.number,
    			sms_time : getCurrentTimeString(),
    			MessageBody : escapeMessage(encodeMessage(params.message)),
    			ID : params.id,
    			encode_type : getEncodeType(params.message).encodeType
            };
            return obj;
        }

        function deal(data){
        	if(!data){
        		errorCabllback($.extend(unknownErrorObject, {errorType: "sendFail", errorText: "send_fail_try_again"}));
        		return;
        	}
        	if (data.result == "success") {
                setTimeout(function(){
                    getSmsStatusInfo({
                        smsCmd : 4,
                        errorType : "sendFail",
                        errorText : "send_fail_try_again"
                    }, callback, errorCabllback);
                }, 1000);
			} else {
				errorCabllback($.extend(unknownErrorObject, {errorType: "sendFail", errorText: "send_fail_try_again"}));
			}
		}
	}

	/**
	 * 保存草稿
	 * @method saveSMS
	 */
	function saveSMS() {
		var callback = arguments[1];
		var errorCabllback = arguments[2] ? arguments[2] : callback;
		return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost){
			var obj = {
				isTest : isTest,
				notCallback : true,
				goformId : "SAVE_SMS",
				SMSMessage : escapeMessage(encodeMessage(params.message)), //短信内容
				SMSNumber : params.numbers.join(";") + ";",//短消息号码
				Index : params.index,//-1表示新建后保存；否则，表示编辑后保存，要传递实际的ID
				encode_type : getEncodeType(params.message).encodeType,
				sms_time : params.currentTimeString,
				draft_group_id : params.groupId //短信组编号
			};
			return obj;
		}

		function deal(data){
			if(!data){
				errorCabllback($.extend(unknownErrorObject, {errorType: "saveFail", errorText: "save_fail"}));
				return;
			}
			if (data.result == "success") {
                getSmsStatusInfo({
                    smsCmd : 5,
                    errorType : "saveFail",
                    errorText : "save_fail"
                }, callback, errorCabllback);
			} else {
				errorCabllback($.extend(unknownErrorObject, {errorType: "saveFail", errorText: "save_fail"}));
			}
		}
	}

    /**
	 * 删除全部短消息
	 * -- 目前经UE确认，移除了删除全部短信功能。此方法暂时保留
	 *
	 * @method deleteAllMessages
	 */
    function deleteAllMessages(){
    	var callback = arguments[1];
    	var errorCabllback = arguments[2] ? arguments[2] : callback;

    	return doStuff(arguments, {}, prepare, deal, null, true);

    	function prepare(params, isPost){
    		//TODO: 由于不分箱子，所有和92实现会不同
            var obj = {
        		isTest : isTest,
        		goformId : "ALL_DELETE_SMS",
        		notCallback : true,
        		which_cgi: params.location
            };
            return obj;
        }

        function deal(data){
        	if(!data){
        		errorCabllback($.extend(unknownErrorObject, {errorType: "deleteFail", errorText: "delete_fail_try_again"}));
        		return;
        	}
        	if (data.result == "success") {
				addTimerThings("sms_cmd_status_info", checkDeleteStatus);
			} else {
				errorCabllback($.extend(unknownErrorObject, {errorType: "deleteFail", errorText: "delete_fail_try_again"}));
			}
		}

		function checkDeleteStatus(data) {
			var status = data.sms_cmd_status_info;
			if(status == "2"){
				removeTimerThings("sms_cmd_status_info", checkDeleteStatus);
				errorCabllback($.extend(unknownErrorObject, {errorType: "deleteFail", errorText: "delete_fail_try_again"}));
			} else if(status == "3"){
				removeTimerThings("sms_cmd_status_info", checkDeleteStatus);
				callback({result: true});
			}
		}
    }

	/**
     * 删除选中短消息
     * @method sendSMS
     */
    function deleteMessage() {
		var callback = arguments[1];
    	var errorCabllback = arguments[2] ? arguments[2] : callback;

    	return doStuff(arguments, {}, prepare, deal, null, true);

    	function prepare(params, isPost){
    		var msgIds = params.ids.join(";") + ";";
            var obj = {
        		isTest : isTest,
        		goformId : "DELETE_SMS",
        		msg_id : msgIds,
        		notCallback : true
            };
            return obj;
        }

        function deal(data){
        	if(!data){
        		errorCabllback($.extend(unknownErrorObject, {errorType: "deleteFail", errorText: "delete_fail_try_again"}));
        		return;
        	}
        	if (data.result == "success") {
                getSmsStatusInfo({
                    smsCmd : 6,
                    errorType : "deleteFail",
                    errorText : "delete_fail_try_again"
                }, callback, errorCabllback);
			} else {
				errorCabllback($.extend(unknownErrorObject, {errorType: "deleteFail", errorText: "delete_fail_try_again"}));
			}
		}
	}

    function getSmsStatusInfo(obj, callback, errorCabllback){
    	asyncRequest({
    		cmd: "sms_cmd_status_info",
    		sms_cmd: obj.smsCmd,
    		isTest: isTest
    	}, function(data){
    		if(data){
    			var status = data.sms_cmd_status_result;
    			if(status == "2"){
    				errorCabllback($.extend(unknownErrorObject, {errorType: obj.errorType, errorText: obj.errorText}));
    			}else if(status == "3"){
    				callback({result: "success"});
    			} else {
                    window.setTimeout(function(){
                        getSmsStatusInfo(obj, callback, errorCabllback);
                    }, 1000);
                }
    		}else{
				errorCabllback($.extend(unknownErrorObject, {errorType: obj.errorType, errorText: obj.errorText}));
    		}
    	}, function(data){
			errorCabllback($.extend(unknownErrorObject, {errorType: obj.errorType, errorText: obj.errorText}));
    	}, false);
    }


    function getSMSReady(){
        if(config.smsIsReady){
            var callback = arguments[1];
            if(callback){
                return callback({"sms_cmd":"1","sms_cmd_status_result":"3"});
            }else{
                return {"sms_cmd":"1","sms_cmd_status_result":"3"};
            }
        } else {
            return doStuff(arguments, {}, prepare, deal, null, false);
        }

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "sms_cmd_status_info";
            requestParams.sms_cmd = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                if(data.sms_cmd_status_result == "3"){
                    config.smsIsReady = true;
                }
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }
    /**
     * 新短信设置为已读
     * @method setSmsRead
     * @param {String} ids 以分号分隔的短信编号
     */
    function setSmsRead() {

		return doStuff(arguments, {}, prepare, deal, null, true);

    	function prepare(params, isPost){
    		var msgIds = params.ids.join(";");
    		if(params.ids.length > 0){
    			msgIds += ";";
    		}
            var obj = {
        		isTest : isTest,
        		goformId : "SET_MSG_READ",
        		msg_id : msgIds,
        		tag : 0
            };
            return obj;
        }

        function deal(data){
        	if (data.result == "success") {
        		return {result: true};
			} else {
				return {result: false};
			}
		}
	}

    /**
     * 获取短信发送报告列表
     * @method getSMSDeliveryReport
     */
    function getSMSDeliveryReport(){
    	return doStuff(arguments, {}, prepare, deal, {}, false);

        function prepare(params, isPost) {
            var obj = {
				isTest : isTest,
				cmd : "sms_status_rpt_data",
				page : params.page,
				data_per_page : params.smsCount
			};
            return obj;
        }

		function deal(data) {
			if (data) {
				return {messages: parseMessages(data.messages, true) };
			} else {
				return unknownErrorObject;
			}
		}
    }

    /**
	 * 退出系统
	 *
	 * @method logout
	 * @return {Object} JSON
	 */
    function logout() {

        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost){
            var obj = $.extend({}, params);
            obj.isTest = isTest;
            obj.goformId = "LOGOUT";
            return obj;
        }

        function deal(data){
            if(data && data.result == "success"){
                timerInfo.isLoggedIn = false;
                return {result: true};
            }else{
                return $.extend(unknownErrorObject, {errorType: "loggedOutError"});
            }
        }
    }

    /**
     * 获取PIN相关信息
     * @method changePassword
     * @param  {Object} JSON
     * @example
      //请求参数映射
     {
         oldPassword:"123456",
         newPassword:"234567"
     }
     * @return {Object} JSON
     */
    function changePassword() {

        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var obj = {};
            obj.newPassword = config.PASSWORD_ENCODE ? Base64.encode(params.newPassword) : params.newPassword;
            obj.oldPassword = config.PASSWORD_ENCODE ? Base64.encode(params.oldPassword) : params.oldPassword;
            obj.goformId = "CHANGE_PASSWORD";
            obj.isTest = isTest;
            return obj;
        }

        function deal(data) {
            if (data && data.result === "success") {
                return {
                    result : true
                };
            } else {
                return $.extend(unknownErrorObject, {
                    errorType : "badPassword"
                });
            }
        }
    }

    /**
     * 获取PIN相关信息
     * @method getPinData
     * @return {Object} JSON
     */
    function getPinData(){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "pinnumber,pin_status,puknumber";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 启用PIN
     * @method enablePin
     * @param  {Object} JSON
     * @example
      //请求参数映射
     {
        oldPin = "1234";
     }
     * @return {Object} JSON
     */
    function enablePin() {

        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var obj = {};
            obj.goformId = "ENABLE_PIN";
            obj.OldPinNumber = params.oldPin;
            obj.isTest = isTest;
            return obj;
        }

        function deal(data) {
            if (data && data.result === "success") {
                return { result:true };
            } else {
                return { result:false};
            }
        }
    }

    /**
     * 禁用PIN
     * @method disablePin
     * @param  {Object} JSON
     * @example
      //请求参数映射
     {
         oldPin = "1234";
     }
     * @return {Object} JSON
     */
    function disablePin() {

        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var obj = {};
            obj.goformId = "DISABLE_PIN";
            obj.OldPinNumber = params.oldPin;
            obj.isTest = isTest;
            return obj;
        }

        function deal(data) {
            if (data && data.result === "success") {
                return { result:true };
            } else {
                return { result:false};
            }
        }
    }

    /**
     * 修改PIN
     * @method changePin
     * @param  {Object} JSON
     * @example
      //请求参数映射
     {
         oldPin = "2345";
         newPin = "1234";
     }
     * @return {Object} JSON
     */
    function changePin() {

        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var obj = {};
            obj.goformId = "ENABLE_PIN";
            obj.OldPinNumber = params.oldPin;
            obj.NewPinNumber = params.newPin;
            obj.isTest = isTest;
            return obj;
        }

        function deal(data) {
            if (data && data.result === "success") {
                return { result:true };
            } else {
                return { result:false};
            }
        }
    }

    /**
     * 获取路由信息
     * @method getLanInfo
     * @return  {Object} JSON
     */
    function getLanInfo() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "lan_ipaddr,upnp_hide,hide_shutdown,lan_netmask,mac_address,dhcpEnabled,dhcpStart,dhcpEnd,dhcpLease_hour,login_mode,user_web_hide_ddns,sleepmode_display,net_selfcheck_display,user_web_hide_wifi";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {};
                result.ipAddress = data.lan_ipaddr;
                result.subnetMask = data.lan_netmask;
                result.macAddress = data.mac_address;
                result.dhcpServer = data.dhcpEnabled;// == "1"? "enable" : "disable";
                result.dhcpStart = data.dhcpStart;
                result.dhcpEnd = data.dhcpEnd;
                result.dhcpLease = parseInt(data.dhcpLease_hour, 10);
				result.login_mode = data.login_mode;
				// result.sleepmode_display = data.sleepmode_display;
				result.sleepmode_display = data.user_web_hide_wifi == '1' ? "no" :data.sleepmode_display ,
				result.net_selfcheck_display = data.net_selfcheck_display ? data.net_selfcheck_display : "yes";
				result.user_web_hide_ddns = data.user_web_hide_ddns;
				result.user_web_hide_wifi = data.user_web_hide_wifi;
				result.upnp_hide = data.upnp_hide;
				result.hide_shutdown = data.hide_shutdown;
                return result;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 设置路由信息
     * @method setLanInfo
     */
    function setLanInfo() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "DHCP_SETTING";
            requestParams.lanIp = params.ipAddress;
            requestParams.lanNetmask = params.subnetMask;
            requestParams.lanDhcpType = params.dhcpServer == "1"? "SERVER" : "DISABLE";
            if(requestParams.lanDhcpType == "SERVER") {
                requestParams.dhcpStart = params.dhcpStart;
                requestParams.dhcpEnd = params.dhcpEnd;
                requestParams.dhcpLease = params.dhcpLease;
            }
            requestParams.dhcp_reboot_flag = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取短信设置参数
     * @method getSmsSetting
     */
    function getSmsSetting() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "sms_parameter_info";
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {};
                result.centerNumber = data.sms_para_sca;
                result.memStroe = data.sms_para_mem_store;
                result.deliveryReport = data.sms_para_status_report;
                switch(parseInt(data.sms_para_validity_period, 10)){
	        		case 143:
	        		    result.validity = "twelve_hours";
	        		    break;
	        		case 167:
	        		    result.validity = "one_day";
	        			break;
	        		case 173:
	        		    result.validity = "one_week";
	        			break;
                    case 244:
                        result.validity = "largest";
                        break;
	        		case 255:
	        		    result.validity = "largest";
	        		    break;
	        		default:
	        			result.validity = "twelve_hours";
	        		    break;
                }
                return result;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 设置短信参数
     * @method setSmsSetting
     */
    function setSmsSetting() {
        var callback = arguments[1];
        var errorCabllback = arguments[2] ? arguments[2] : callback;
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "SET_MESSAGE_CENTER";
            requestParams.save_time = params.validity;
            requestParams.MessageCenter = params.centerNumber;
            requestParams.status_save = params.deliveryReport;
            requestParams.save_location = 'native';
            requestParams.notCallback = true;
            return requestParams;
        }

        function deal(data) {
            if(!data){
                errorCabllback($.extend(unknownErrorObject, {errorType: "smsSettingFail", errorText: "error_info"}));
                return;
            }
            if (data.result == "success") {
                getSmsStatusInfo({
                    smsCmd : 3,
                    errorType : "smsSettingFail",
                    errorText : "error_info"
                }, callback, errorCabllback);
            } else {
                errorCabllback($.extend(unknownErrorObject, {errorType: "deleteFail", errorText: "delete_fail_try_again"}));
            }
        }
    }

    /**
     * 恢复出厂设置
     * @method restoreFactorySettings
     * @return {Object} JSON
     */
    function restoreFactorySettings() {
        var preErrorObj = {};
        if(config.HAS_PARENTAL_CONTROL && config.currentUserInChildGroup != false){
            preErrorObj = {errorType: 'no_auth'};
        }
        return doStuff(arguments, preErrorObj , prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "RESTORE_FACTORY_SETTINGS";
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 检测恢复出厂设置是否完成
     * @method checkRestoreStatus
     */
    function checkRestoreStatus(successCallback) {
        var requestParams = {};
        requestParams.isTest = isTest;
        requestParams.cmd = "restore_flag";
        requestParams.multi_data = 1;
        asyncRequest(requestParams, function (data) {
            if (data && data.restore_flag === "1") {
                successCallback();
            } else {
                setTimeout(function () {
                    checkRestoreStatus(successCallback);
                }, 5000);
            }
        }, function () {
            setTimeout(function () {
                checkRestoreStatus(successCallback);
            }, 5000);
        }, false);
    }

    /**
     * 获取wps相关信息
     * @method getWpsInfo
     */
    function getWpsInfo() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "wifi_wps_index,WscModeOption,AuthMode,wifi_cur_state,EncrypType,wps_mode,WPS_SSID,m_ssid_enable,SSID1,m_SSID,m_EncrypType,m_AuthMode,wifi_sta_connection";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {};
                result.wpsFlag = data.WscModeOption;
                result.authMode = data.AuthMode;
                result.wpsType = data.wps_mode;
                result.radioFlag = data.wifi_cur_state == "1" ? "1" : "0";
                result.encrypType = data.EncrypType;
				result.wpsSSID = data.WPS_SSID;
				result.ssidEnable = data.m_ssid_enable;
				result.ssid = data.SSID1;
				result.multiSSID = data.m_SSID;
                result.m_encrypType = data.m_EncrypType;
				result.wifi_wps_index = data.wifi_wps_index;
				result.AuthMode = data.AuthMode;
				result.m_AuthMode = data.m_AuthMode;
				result.ap_station_enable = data.wifi_sta_connection;
                return result;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 开启wps
     * @method openWps
     */
    function openWps() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "WIFI_WPS_SET";
            requestParams.WPS_SSID = params.wpsSSID;
            requestParams.wps_mode = params.wpsType;
            requestParams.wifi_wps_index = params.wpsIndex;
            if(requestParams.wps_mode == 'PIN') {
                requestParams.wps_pin = params.wpsPin;
            }
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 开启5.0G wps
     * @method openWps_5g
     */
    function openWps_5g() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "WIFI_M_WPS_SET";
            requestParams.m_WPS_SSID = params.wpsSSID;
            requestParams.m_wps_mode = params.wpsType;
            requestParams.m_wifi_wps_index = params.wpsIndex;
            if(requestParams.m_wps_mode == 'PIN') {
                requestParams.m_wps_pin = params.wpsPin;
            }
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取wifi 休眠信息
     * @method getSleepInfo
     */
    function getSleepMode() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "Sleep_interval";
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {};
                result.sleepMode = data.Sleep_interval;
                return result;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取机卡互锁信息
     * @method mach_sim_lock_statusfunc
     * debug_enable ：0表示用户模式，1表示研发模式。
     */
    function mach_sim_lock_statusfunc() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "mach_sim_lock_status,mach_sim_lock,ppp_status,debug_enable";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {};
                result.mach_sim_lock_status = data.mach_sim_lock_status;
                result.mach_sim_lock = data.mach_sim_lock;
                result.ppp_status = data.ppp_status;
                result.debug_enable = data.debug_enable;
                return result;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 设置解除机卡互锁
     * @method set_MACH_SIM_LOCK
     */
    function set_MACH_SIM_LOCK() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "DELETE_MACH_SIM_LOCK";
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 设置wifi休眠信息
     * @method setSleepMode
     */
    function setSleepMode() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "SET_WIFI_SLEEP_INFO";
            requestParams.sysIdleTimeToSleep = params.sleepMode;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取防火墙安全信息
     * @method getSysSecurity
     */
    function getSysSecurity() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "RemoteManagement,WANPingFilter";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {};
                result.remoteFlag = data.RemoteManagement == "1"? "1" : "0";
                result.pingFlag = data.WANPingFilter == "1"? "1" : "0";
                return result;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 设置防火墙安全信息
     * @method setSysSecurity
     */
    function setSysSecurity() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "FW_SYS";
            requestParams.remoteManagementEnabled = params.remoteFlag;
            requestParams.pingFrmWANFilterEnabled = params.pingFlag;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取端口转发信息
     * @method getPortForward
     */
    function getPortForward() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "PortForwardEnable,PortForwardRules_0,PortForwardRules_1,PortForwardRules_2,PortForwardRules_3,PortForwardRules_4,PortForwardRules_5,PortForwardRules_6,PortForwardRules_7,PortForwardRules_8,PortForwardRules_9";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {};
                result.portForwardEnable = data.PortForwardEnable;
                //from 93, refactory later
                var rules = [];
                if(data.PortForwardRules_0 != ""){
                    rules.push([0,data.PortForwardRules_0]);
                }
                if(data.PortForwardRules_1 != ""){
                    rules.push([1,data.PortForwardRules_1]);
                }
                if(data.PortForwardRules_2 != ""){
                    rules.push([2,data.PortForwardRules_2]);
                }
                if(data.PortForwardRules_3 != ""){
                    rules.push([3,data.PortForwardRules_3]);
                }
                if(data.PortForwardRules_4 != ""){
                    rules.push([4,data.PortForwardRules_4]);
                }
                if(data.PortForwardRules_5 != ""){
                    rules.push([5,data.PortForwardRules_5]);
                }
                if(data.PortForwardRules_6 != ""){
                    rules.push([6,data.PortForwardRules_6]);
                }
                if(data.PortForwardRules_7 != ""){
                    rules.push([7,data.PortForwardRules_7]);
                }
                if(data.PortForwardRules_8 != ""){
                    rules.push([8,data.PortForwardRules_8]);
                }
                if(data.PortForwardRules_9 != ""){
                    rules.push([9,data.PortForwardRules_9]);
                }
                result.portForwardRules = parsePortForwardRules(rules);
                return result;
            } else {
                return unknownErrorObject;
            }
        }

        //from 93, refactory later
        function parsePortForwardRules(data) {
            var rules = [];
            if(data && data.length > 0){
                for(var i = 0; i < data.length; i++){
                    var aRule = {};
                    var elements = data[i][1].split(",");
                    aRule.index = data[i][0];
                    aRule.ipAddress = elements[0];
                    aRule.portRange = elements[1] + ' - ' + elements[2];
                    aRule.protocol = transProtocol(elements[3]);
                    aRule.comment = elements[4];
                    rules.push(aRule);
                }
            }
            return rules;
        }
    }

    /**
     * 设置端口转发信息
     * @method setPortForward
     */
    function setPortForward() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "FW_FORWARD_ADD";
            requestParams.ipAddress = params.ipAddress;
            requestParams.portStart = params.portStart;
            requestParams.portEnd = params.portEnd;
            requestParams.protocol = params.protocol;
            requestParams.comment = params.comment;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 删除端口转发规则
     * @method setPortForward
     */
    function deleteForwardRules() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "FW_FORWARD_DEL";
            requestParams.delete_id = params.indexs.join(';') + ";";
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 虚拟服务器设置
     * @method enableVirtualServer
     */
    function enableVirtualServer() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "VIRTUAL_SERVER";
            requestParams.PortForwardEnable = params.portForwardEnable;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取快速设置需要的数据
     * @method getQuickSettingInfo
     */
    function getQuickSettingInfo() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            var wpask = config.PASSWORD_ENCODE ? ",WPAPSK1_encode" : ",WPAPSK1";
            requestParams.cmd = "pdp_type,ipv6_pdp_type,wifi_cur_state,SSID1,HideSSID,AuthMode,WscModeOption,ppp_status,apn_index,ipv6_apn_index,ipv6_APN_index,m_profile_name,apn_mode,EncrypType,DefaultKeyID,Key1Str1,Key2Str1,Key3Str1,Key4Str1" + wpask +
                ",APN_config0,APN_config1,APN_config2,APN_config3,APN_config4,APN_config5,APN_config6,APN_config7,APN_config8,APN_config9,APN_config10,APN_config11,APN_config12,APN_config13,APN_config14,APN_config15,APN_config16,APN_config17,APN_config18,APN_config19" +
                ",ipv6_APN_config0,ipv6_APN_config1,ipv6_APN_config2,ipv6_APN_config3,ipv6_APN_config4,ipv6_APN_config5,ipv6_APN_config6,ipv6_APN_config7,ipv6_APN_config8,ipv6_APN_config9,ipv6_APN_config10,ipv6_APN_config11,ipv6_APN_config12,ipv6_APN_config13,ipv6_APN_config14,ipv6_APN_config15,ipv6_APN_config16,ipv6_APN_config17,ipv6_APN_config18,ipv6_APN_config19";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                if(config.PASSWORD_ENCODE){
                    data.WPAPSK1 = Base64.decode(data.WPAPSK1_encode);
                }
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }


    /**
     * 快速设置(支持IPv6)
     * @method setQuickSetting4IPv6
     */
    function setQuickSetting4IPv6() {
        doStuffAndCheckServerIsOnline(arguments, prepare, deal);

        function prepare(params) {
            var requestParams = {
                isTest:isTest,
                goformId:"QUICK_SETUP_EX",
                index:params.apn_index,
                pdp_type:params.pdp_type,
                apn_mode:params.apnMode,
                profile_name:params.profile_name,
                wan_apn:params.wan_apn,
                ppp_auth_mode:params.ppp_auth_mode,
                ppp_username:params.ppp_username,
                ppp_passwd:params.ppp_passwd,
                ipv6_wan_apn:params.ipv6_wan_apn,
                ipv6_ppp_auth_mode:params.ipv6_ppp_auth_mode,
                ipv6_ppp_username:params.ipv6_ppp_username,
                ipv6_ppp_passwd:params.ipv6_ppp_passwd,
                SSID_name:params.SSID_name,
                SSID_Broadcast:params.SSID_Broadcast,
                Encryption_Mode_hid:params.Encryption_Mode_hid,
                security_shared_mode:params.security_shared_mode,
                WPA_PreShared_Key:config.PASSWORD_ENCODE ? Base64.encode(params.WPA_PreShared_Key) : params.WPA_PreShared_Key,
                wep_default_key:params.wep_default_key,
                WPA_ENCRYPTION_hid:params.WPA_ENCRYPTION_hid
            }
			requestParams.wep_key_1 = params.wep_key_1;
			requestParams.wep_key_2 = params.wep_key_2;
			requestParams.wep_key_3 = params.wep_key_3;
			requestParams.wep_key_4 = params.wep_key_4;
			if(params.wep_default_key =='1'){
				requestParams.WEP2Select = params.WEP2Select;
			}else if(params.wep_default_key =='2'){
				requestParams.WEP3Select = params.WEP3Select;
			}else if(params.wep_default_key =='3'){
				requestParams.WEP4Select = params.WEP4Select;
			}else{
				requestParams.WEP1Select = params.WEP1Select;
			}
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return $.extend(unknownErrorObject, {errorType:"SetSetUpError"});
            }
        }
    }

    /**
     * 业务处理后，轮询检测服务器是否可以连接，可连接时执行回调函数
     * @method doStuffAndCheckServerIsOnline
     */
    function doStuffAndCheckServerIsOnline(arg, prepare, deal) {
        //server是否正常
        var isServerOnline = false;
        //callback是否执行
        var isCallbackExecuted = false;
        var params = prepare(arg[0]);
        var callback = arg[1];
        var successCallback = function (data) {
            isServerOnline = true;
            if (!isCallbackExecuted && callback) {
                callback(deal(data));
            }
            isCallbackExecuted = true;
        };
        var errorMethod = arg[2];
        var errorCallback = function () {
            isServerOnline = true;
            if (errorMethod) {
                errorMethod();
            }
        };

        asyncRequest(params, successCallback, errorCallback, true);

        addTimeout(function () {
            if (isServerOnline == false) {
                var timer = addInterval(function () {
                    if (isServerOnline == false) {
                        getLanguage({}, function (data) {
							window.clearInterval(timer);
                            successCallback({result:"success"});
                        });
                    }
                }, 1000);
            }
        }, 5000);
    }

    /**
     * 获取SD Card配置信息
     * @method getSDConfiguration
     */
    function getSDConfiguration(){
    	return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {
	            isTest : isTest,
	            cmd : "sdcard_mode_option,sd_card_state,HTTP_SHARE_STATUS,HTTP_SHARE_WR_AUTH,HTTP_SHARE_FILE",
	            multi_data: 1
            };
            return requestParams;
        }

        function deal(data) {
            if (data) {
            	var fileToShare;
            	if("mmc2" == data.HTTP_SHARE_FILE || "/mmc2" == data.HTTP_SHARE_FILE || "/mmc2/" == data.HTTP_SHARE_FILE){
            		fileToShare = "1";
            	} else {
            		fileToShare = "0";
            	}
            	var result = {
        			sd_mode: data.sdcard_mode_option == "1" ? "0" : "1",
        			sd_status: data.sd_card_state,
        			share_status: data.HTTP_SHARE_STATUS == "Enabled" ? "1" : "0",
        			share_auth: data.HTTP_SHARE_WR_AUTH == "readOnly" ? "0" : "1",
        			file_to_share: fileToShare,
        			share_file: data.HTTP_SHARE_FILE
            	};
                return result;
            } else {
                return unknownErrorObject;
            }
        }
    }
    /**
     * 设置SD Card Mode
     * @method setSdCardMode
     */
    function setSdCardMode(){
    	return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {
	            isTest : isTest,
	            goformId : "HTTPSHARE_MODE_SET",
	            mode_set: params.mode == "0" ? "http_share_mode" : "usb_mode"
            };
            return requestParams;
        }

        function deal(data) {
			if (data && data.result == 'success') {
				return {result: 'success'};
			} else if(data && data.result == 'processing'){
				return {result: 'processing'};
			}else {
				return {result: false};
			}
		}
    }

    /**
     * 检查文件是否存在
     * @method checkFileExists
     */
    function checkFileExists(){
    	return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {
	            isTest : isTest,
	            goformId : "GOFORM_HTTPSHARE_CHECK_FILE",
	            path_SD_CARD: params.path
            };
            return requestParams;
        }

        function deal(data) {
			if (data) {
				if (data.result == "no_sdcard") {
					return {
						status : "no_sdcard"
					};
				} else if (data.result == "noexist") {
					return {
						status : "noexist"
					};
				} else if (data.result == "processing") {
					return {
						status : "processing"
					};
				} else {
					return {
						status : "exist"
					};
				}
			} else {
				return unknownErrorObject;
			}
		}
    }

    /**
	 * 进入文件夹，并获取文件夹内文件列表
	 *
	 * @method getFileList
	 * @return {Object}
	 * @example
	 * 		{"result":{"totalRecord":"4", "fileInfo":[
	 *          {"fileName":"card","attribute":"document","size":"0","lastUpdateTime":"20120510"},
	 *          {"fileName":"cf","attribute":"document","size":"0","lastUpdateTime":"20120510"},
	 *          {"fileName":"net","attribute":"document","size":"0","lastUpdateTime":"20120510"},
	 *          {"fileName":"ram","attribute":"document","size":"0","lastUpdateTime":"20120510"}]}}
	 */
	function getFileList() {
		return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
			var requestParams = {
				isTest : isTest,
				goformId : "HTTPSHARE_ENTERFOLD",
				path_SD_CARD : params.path,
				indexPage : params.index
			};
			return requestParams;
		}

		function deal(data) {
			if (data) {
				if (data.result == 'failure') {
					return $.extend(unknownErrorObject, {
						errorType : "get_file_list_failure"
					});
				} else if (data.result == "no_sdcard") {
					return $.extend(unknownErrorObject, {
						errorType : "no_sdcard"
					});
				} else {
					return parseSdCardFile(data.result);
				}
			} else {
				return unknownErrorObject;
			}
		}

		function parseSdCardFile(result) {
			var fileInfo = {};
			fileInfo.totalRecord = result.totalRecord;
			var fileArr = [];
			var details = result.fileInfo;
			for ( var i = 0; details && i < details.length; i++) {
				if(details[i].fileName == ""){
					continue;
				}
				var obj = {};
				obj.fileName = details[i].fileName;
				obj.attribute = details[i].attribute;
				obj.size = details[i].size;
				obj.lastUpdateTime = details[i].lastUpdateTime;
				fileArr.push(obj);
			}
			fileInfo.details = fileArr;
			return fileInfo;
		}
	}

    /**
     * sd card 文件重命名
     * @method fileRename
     * @return {Object}
     * @example
     * requestParams = {
			goformId : "HTTPSHARE_FILE_RENAME",
            path_SD_CARD : params.path,
			OLD_NAME_SD_CARD : oldpath,
			NEW_NAME_SD_CARD : newpath
		}
     */
    function fileRename(){
    	return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var d = new Date();
            var currentTime = d.getTime();
            var zoneOffsetSeconds = d.getTimezoneOffset() * 60;
            return {
                isTest: isTest,
                goformId: "HTTPSHARE_FILE_RENAME",
                path_SD_CARD: params.path,
                OLD_NAME_SD_CARD: params.oldPath,
                NEW_NAME_SD_CARD: params.newPath,
                path_SD_CARD_time: transUnixTime(currentTime),
                path_SD_CARD_time_unix: Math.round((currentTime - zoneOffsetSeconds * 1000) / 1e3)
            };
        }

        function deal(data) {
			if (data) {
				if (data.result == "success") {
					return {
						result : true
					};
				} else if (data.result == "no_sdcard") {
					return $.extend(unknownErrorObject, {
						errorType : "no_sdcard"
					});
				} else if (data.result == "noexist") {
					return $.extend(unknownErrorObject, {
						errorType : "no_exist"
					});
				} else if (data.result == "processing") {
					return $.extend(unknownErrorObject, {
						errorType : "sd_file_processing_cant_rename"
					});
				} else {
					return {
						result : false
					};
				}
			} else {
				return unknownErrorObject;
			}
		}
    }

    /**
     * 获取SD Card容量
     * @method getSdMemorySizes
     * @return {Object}
     * @example
     * {
			totalMemorySize : data.sd_card_total_size,
			availableMemorySize : data.sd_card_avi_space
		}
     */
    function getSdMemorySizes() {
		return doStuff(arguments, {}, prepare, deal, null, false);

		function prepare(params, isPost) {
			var requestParams = {
				isTest : isTest,
				cmd : "HTTPSHARE_GETCARD_VALUE"
			};
			return requestParams;
		}

		function deal(data) {
			if (!data || (data.result && data.result == "no_sdcard")) {
				return $.extend(unknownErrorObject, {
					errorType : "no_sdcard"
				});
			} else {
				return {
					totalMemorySize : data.sd_card_total_size == "" ? 0 : data.sd_card_total_size * 32 * 1024,
					availableMemorySize : data.sd_card_avi_space == "" ? 0 : data.sd_card_avi_space * 32 * 1024
				};
			}
		}
	}

    /**
	 * 删除文件和文件夹
	 *
	 * @method deleteFilesAndFolders
	 * @params {Object}
	 * @example
	 * {
	 * 		goformId : "HTTPSHARE_DEL",
	 * 		path_SD_CARD: params.path,
	 *  	name_SD_CARD: params.names
	 *  }
	 */
    function deleteFilesAndFolders(){
    	return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
            var currentTime = new Date().getTime();
            var requestParams = {
                isTest : isTest,
                goformId : "HTTPSHARE_DEL",
                path_SD_CARD : params.path,
                name_SD_CARD : params.names,
                path_SD_CARD_time: transUnixTime(currentTime),
                path_SD_CARD_time_unix: Math.round(currentTime / 1e3)
            };
			return requestParams;
		}

		function deal(data) {
			if (data.result && data.result == "failure") {
				return {
					status : "failure"
				};
			} else if (data.result && data.result == "no_sdcard") {
				return {
					status : "no_sdcard"
				};
			} else if (data.result && data.result == "processing") {
				return {
					status : "processing"
				};
			} else if (data.result && data.result == "success") {
				return {
					status : "success"
				};
			} else {
				return unknownErrorObject;
			}
		}
    }

    /**
	 * 创建文件夹
	 *
	 * @method createFolder
	 * @params {Object}
	 * @example
	 * {
	 * 		goformId : "HTTPSHARE_NEW",
	 * 		path_SD_CARD: params.path,
	 *  	name_SD_CARD: params.names
	 *  }
	 */
	function createFolder() {
		return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
            var d = new Date();
            var currentTime = d.getTime();
            var zoneOffsetSeconds = d.getTimezoneOffset() * 60;
			return {
                isTest: isTest,
                goformId: "HTTPSHARE_NEW",
                path_SD_CARD: params.path,
                path_SD_CARD_time: transUnixTime(currentTime),
                path_SD_CARD_time_unix: Math.round((currentTime - zoneOffsetSeconds * 1000) / 1e3)
			};
		}

		function deal(data) {
			if (data.result && data.result == "failure") {
				return $.extend(unknownErrorObject, {
					errorType : "create_folder_failure"
				});
			} else if (data.result && data.result == "no_sdcard") {
				return $.extend(unknownErrorObject, {
					errorType : "no_sdcard"
				});
			} else if (data.result && data.result == "success") {
				return {
					result : true
				};
			} else {
				return unknownErrorObject;
			}
		}
	}



    /**
	 * 设置SD 卡共享参数
	 *
	 * @method setSdCardSharing
	 * @params {Object}
	 * @example
	 * requestParams = {
	            isTest : isTest,
	            goformId : "HTTPSHARE_AUTH_SET",
        		HTTP_SHARE_STATUS: params.share_status == "1" ? "Enabled" : "Disabled",
        		HTTP_SHARE_WR_AUTH: params.share_auth == "1" ? "readWrite" : "readOnly",
        		HTTP_SHARE_FILE: params.share_file
            };
	 */
    function setSdCardSharing(){
    	return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {
	            isTest : isTest,
	            goformId : "HTTPSHARE_AUTH_SET",
        		HTTP_SHARE_STATUS: params.share_status == "1" ? "Enabled" : "Disabled",
        		HTTP_SHARE_WR_AUTH: params.share_auth == "1" ? "readWrite" : "readOnly",
        		HTTP_SHARE_FILE: params.share_file
            };
            return requestParams;
        }

        function deal(data) {
			if (data) {
				if (data.result == "no_sdcard") {
					return $.extend(unknownErrorObject, {
						errorType : "no_sdcard"
					});
				} else {
					return {
						result : true
					};
				}
			} else {
				return unknownErrorObject;
			}
		}
    }

    /**
     * 获取端口过滤信息
     * @method getPortFilter
     */
    function getPortFilter() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "IPPortFilterEnable,DefaultFirewallPolicy,IPPortFilterRules_0,IPPortFilterRules_1,IPPortFilterRules_2,IPPortFilterRules_3,IPPortFilterRules_4,IPPortFilterRules_5,IPPortFilterRules_6,IPPortFilterRules_7,IPPortFilterRules_8,IPPortFilterRules_9";
            requestParams.cmd += ",IPPortFilterRulesv6_0,IPPortFilterRulesv6_1,IPPortFilterRulesv6_2,IPPortFilterRulesv6_3,IPPortFilterRulesv6_4,IPPortFilterRulesv6_5,IPPortFilterRulesv6_6,IPPortFilterRulesv6_7,IPPortFilterRulesv6_8,IPPortFilterRulesv6_9";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {};
                result.portFilterEnable = data.IPPortFilterEnable;
                result.defaultPolicy = data.DefaultFirewallPolicy;
                //from 93, refactory later
                var rules = [];
                if(data.IPPortFilterRules_0 != ""){
                    rules.push([0,data.IPPortFilterRules_0]);
                }
                if(data.IPPortFilterRules_1 != ""){
                    rules.push([1,data.IPPortFilterRules_1]);
                }
                if(data.IPPortFilterRules_2 != ""){
                    rules.push([2,data.IPPortFilterRules_2]);
                }
                if(data.IPPortFilterRules_3 != ""){
                    rules.push([3,data.IPPortFilterRules_3]);
                }
                if(data.IPPortFilterRules_4 != ""){
                    rules.push([4,data.IPPortFilterRules_4]);
                }
                if(data.IPPortFilterRules_5 != ""){
                    rules.push([5,data.IPPortFilterRules_5]);
                }
                if(data.IPPortFilterRules_6 != ""){
                    rules.push([6,data.IPPortFilterRules_6]);
                }
                if(data.IPPortFilterRules_7 != ""){
                    rules.push([7,data.IPPortFilterRules_7]);
                }
                if(data.IPPortFilterRules_8 != ""){
                    rules.push([8,data.IPPortFilterRules_8]);
                }
                if(data.IPPortFilterRules_9 != ""){
                    rules.push([9,data.IPPortFilterRules_9]);
                }
                result.portFilterRules = parsePortFilterRules(rules, "IPv4");

                //ipv6
                    var v6Rules = [];
                    if(data.IPPortFilterRulesv6_0 != ""){
                        v6Rules.push([10,data.IPPortFilterRulesv6_0]);
                    }
                    if(data.IPPortFilterRulesv6_1 != ""){
                        v6Rules.push([11,data.IPPortFilterRulesv6_1]);
                    }
                    if(data.IPPortFilterRulesv6_2 != ""){
                        v6Rules.push([12,data.IPPortFilterRulesv6_2]);
                    }
                    if(data.IPPortFilterRulesv6_3 != ""){
                        v6Rules.push([13,data.IPPortFilterRulesv6_3]);
                    }
                    if(data.IPPortFilterRulesv6_4 != ""){
                        v6Rules.push([14,data.IPPortFilterRulesv6_4]);
                    }
                    if(data.IPPortFilterRulesv6_5 != ""){
                        v6Rules.push([15,data.IPPortFilterRulesv6_5]);
                    }
                    if(data.IPPortFilterRulesv6_6 != ""){
                        v6Rules.push([16,data.IPPortFilterRulesv6_6]);
                    }
                    if(data.IPPortFilterRulesv6_7 != ""){
                        v6Rules.push([17,data.IPPortFilterRulesv6_7]);
                    }
                    if(data.IPPortFilterRulesv6_8 != ""){
                        v6Rules.push([18,data.IPPortFilterRulesv6_8]);
                    }
                    if(data.IPPortFilterRulesv6_9 != ""){
                        v6Rules.push([19,data.IPPortFilterRulesv6_9]);
                    }
                    result.portFilterRules = _.union(result.portFilterRules, parsePortFilterRules(v6Rules, "IPv6"));

                return result;
            } else {
                return unknownErrorObject;
            }
        }

        //from 93, refactory later
        function parsePortFilterRules(data, ipTypeTmp) {
            var rules = [];
            if(data && data.length > 0){
                for(var i = 0; i < data.length; i++){
                    var aRule = {};
                    //192.168.0.5,0,1,6,192.168.0.53,0,1,655,1,1,kk,00:1E:90:FF:FF:FF
                    var elements = data[i][1].split(",");
                    aRule.index = data[i][0];
                    aRule.macAddress = elements[11];
                    aRule.destIpAddress = elements[4] == "any/0"? "" : elements[4];
                    aRule.sourceIpAddress = elements[0] == "any/0"? "" : elements[0];
                    aRule.destPortRange = elements[6] == '0' ? '' : elements[6] + " - " + elements[7];
                    aRule.sourcePortRange = elements[2] == '0' ? '' : elements[2] + " - " + elements[3];
                    aRule.action = elements[9] == 1 ? "filter_accept" : "filter_drop";
                    aRule.protocol = transProtocol(elements[8]);
                    aRule.comment = elements[10];
                    aRule.ipType = ipTypeTmp;
                    rules.push(aRule);
                }
            }
            return rules;
        }
    }

    /**
     * 设置端口过滤基本信息
     * @method setPortFilterBasic
     */
    function setPortFilterBasic() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "BASIC_SETTING";
            requestParams.portFilterEnabled = params.portFilterEnable;
            requestParams.defaultFirewallPolicy = params.defaultPolicy;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 设置端口过滤信息
     * @method setPortFilter
     */
    function setPortFilter() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "ADD_IP_PORT_FILETER_V4V6";
            requestParams.ip_version = params.ipType;

            requestParams.mac_address = params.macAddress;
            requestParams.dip_address = params.destIpAddress;
            requestParams.sip_address = params.sourceIpAddress;
            requestParams.dFromPort = params.destPortStart;
            requestParams.dToPort = params.destPortEnd;
            requestParams.sFromPort = params.sourcePortStart;
            requestParams.sToPort = params.sourcePortEnd;
            requestParams.action = params.action;
            requestParams.protocol = params.protocol;
            requestParams.comment = params.comment;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 删除端口过滤信息
     * @method deleteFilterRules
     */
    function deleteFilterRules() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;

            var deleteIds = _.filter(params.indexs, function(item){
                return item.length == 1;
            });

                requestParams.goformId = "DEL_IP_PORT_FILETER_V4V6";
                var deletev6Ids = [];
                _.each(params.indexs, function(item) {
                    if(item.length == 2) {
                        deletev6Ids.push(item.substring(1));
                    }
                });

                requestParams.delete_id_v6 = deletev6Ids.length > 0 ? deletev6Ids.join(';') + ";" : "";

            requestParams.delete_id = deleteIds.length > 0 ? deleteIds.join(';') + ";" : "";
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取wifi高级信息
     * @method getWifiAdvance
     * @return {Object} wifi JSON 对象
     */
    function getWifiAdvance() {

        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "WirelessMode,CountryCode,Channel,HT_MCS,wifi_band,wifi_11n_cap,MAX_Access_num,m_MAX_Access_num,MAX_Station_num,wifi_sta_connection,sta_ip_status";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {
                    mode: data.WirelessMode,
                    countryCode: data.CountryCode,
                    channel: data.Channel,
                    rate: data.HT_MCS,
                    wifiBand: data.wifi_band == 'a' ? 'a' : 'b',
                    bandwidth: data.wifi_11n_cap,
                    MAX_Station_num: $.isNumeric(data.MAX_Station_num) ? data.MAX_Station_num : config.MAX_STATION_NUMBER,
                    MAX_Access_num: data.MAX_Access_num,
                    m_MAX_Access_num: data.m_MAX_Access_num,
                    ap_station_enable: data.wifi_sta_connection,
                    sta_ip_status:data.sta_ip_status
                };
                return result;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 设置wifi高级信息
     * @method setWifiAdvance
     * @param {Object} JSON 参数对象
     */
    function setWifiAdvance() {
        doStuffAndCheckServerIsOnline(arguments, prepare, deal);

        function prepare(params) {
            var requestParams = {
                goformId : "SET_WIFI_INFO",
                isTest : isTest,
                wifiMode : params.mode,
                countryCode : params.countryCode,
                MAX_Access_num: params.station,
                m_MAX_Access_num: params.m_station
            };
            if(config.WIFI_BAND_SUPPORT){
            	requestParams.wifi_band = params.wifiBand;
            }
            if(config.WIFI_BAND_SUPPORT && params.wifiBand == 'a'){ // 5G
            	requestParams.selectedChannel = 'auto';
            } else {
            	requestParams.selectedChannel = params.channel;
            	requestParams.abg_rate = params.rate;
            }
            if(config.WIFI_BANDWIDTH_SUPPORT){
            	requestParams.wifi_11n_cap = params.bandwidth;
            }
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取设备基本信息
     * @method getDeviceInfo
     */
    function getDeviceInfo(){
    	return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {
            	isTest: isTest,
                cmd : "hide_sn,sn_boardnum,hide_sim_iccid,display_model,cellid_hide,ziccid,nv_enodbid,cell_id,nv_pci,nv_band,nv_arfcn,wifi_mac,wifi_coverage,m_ssid_enable,imei,network_type,sub_network_type,rssi,rscp,lte_rsrp,imsi,sim_imsi,cr_version,hw_version,MAX_Access_num," +
                		"SSID1,AuthMode,WPAPSK1_encode,m_SSID,m_AuthMode,m_HideSSID,m_WPAPSK1_encode,m_MAX_Access_num,lan_ipaddr," +
                		"mac_address,msisdn,product_model_prefix,LocalDomain,wan_ipaddr,static_wan_ipaddr,ipv6_wan_ipaddr,ipv6_pdp_type,pdp_type,ppp_status,sta_ip_status,rj45_state,ethwan_mode,nv_cqi0,nv_rsrq,nv_sinr,nv_cellid,web_version",
                multi_data : 1
            };
            return requestParams;
        }

        function deal(data) {
			if (data) {
                return {
                    hide_sn: data.hide_sn,
                    sn_boardnum: data.sn_boardnum,
                    hide_sim_iccid: data.hide_sim_iccid,
                    display_model: data.display_model,
                    cellid_hide: data.cellid_hide,
                    nv_rscp: data.rscp,
					ziccid: data.ziccid,
					nv_enodbid: data.nv_enodbid,
					cell_id: data.nv_cellid,
					nv_pci: data.nv_pci,
                    nv_cqi: data.nv_cqi0,
                    nv_rsrq:data.nv_rsrq,
                    nv_rsrp:data.lte_rsrp,
                    nv_rssi:data.rssi,
                    nv_snr:data.nv_sinr,
					nv_band: data.nv_band,
					nv_arfcn: data.nv_arfcn,
                	wifi_mac: data.wifi_mac,
                	ssid: data.SSID1,
                    authMode:data.AuthMode,
                	passPhrase: Base64.decode(data.WPAPSK1_encode),
                    m_ssid: data.m_SSID,
                    m_authMode: data.m_AuthMode,
                    m_passPhrase: Base64.decode(data.m_WPAPSK1_encode),
                    m_max_access_num: data.m_MAX_Access_num,
                    multi_ssid_enable: data.m_ssid_enable,
                	ipAddress: data.lan_ipaddr,
                	wanIpAddress: data.wan_ipaddr,
					staticWanIpAddress: data.static_wan_ipaddr,
                	ipv6WanIpAddress: data.ipv6_wan_ipaddr,
                	ipv6PdpType: data.ipv6_pdp_type,
                	macAddress: data.mac_address,
                	simSerialNumber: data.msisdn,
                    product_model_prefix: data.product_model_prefix,
                	lanDomain: data.LocalDomain,
                	imei: data.imei,
					signal: convertSignal(data),
					imsi: data.imsi || data.sim_imsi,
                	sw_version: data.cr_version,
                	hw_version: data.hw_version,
                	max_access_num: data.MAX_Access_num,
                    wifiRange: data.wifi_coverage,
					pdpType: data.pdp_type,
					rj45ConnectStatus: (typeof data.rj45_state == 'undefined' || data.rj45_state == '') ? 'dead' : data.rj45_state,
					blc_wan_mode: timerInfo.blc_wan_mode,
					connectStatus: data.ppp_status,
					wifiConStatus: data.sta_ip_status,
					ethwan_mode: data.ethwan_mode.toUpperCase(),
                    			web_version: data.web_version
                };
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取wifi覆盖范围
     * @method getWifiRange
     */
    function getWifiRange() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "wifi_coverage";
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {};
                result.wifiRangeMode = data.wifi_coverage;
                return result;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 设置wifi覆盖范围
     * @method getWifiRange
     */
    function setWifiRange() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.goformId = "SET_WIFI_COVERAGE";
            requestParams.isTest = isTest;
            requestParams.wifi_coverage = params.wifiRangeMode;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     *获取upnp信息
     * @method getUpnpSetting
     */
    function getUpnpSetting() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "upnpEnabled";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {};
                result.upnpSetting = data.upnpEnabled == "1"? "1" : "0";
                return result;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     *设置upnp信息
     * @method setUpnpSetting
     */
    function setUpnpSetting() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.goformId = "UPNP_SETTING";
            requestParams.isTest = isTest;
            requestParams.upnp_setting_option = params.upnpSetting;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     *获取dmz信息
     * @method getUpnpSetting
     */
    function getDmzSetting() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "DMZEnable,DMZIPAddress";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {};
                result.dmzSetting = data.DMZEnable == "1"? "1" : "0";
                result.ipAddress = data.DMZIPAddress;
                return result;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     *设置dmz信息
     * @method setDmzSetting
     */
    function setDmzSetting() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.goformId = "DMZ_SETTING";
            requestParams.isTest = isTest;
            requestParams.DMZEnabled = params.dmzSetting;
            if(requestParams.DMZEnabled == '1') {
                requestParams.DMZIPAddress = params.ipAddress;
            }

            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取端口映射规则
     * @method getPortMap
     */
    function getPortMap() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "PortMapEnable,PortMapRules_0,PortMapRules_1,PortMapRules_2,PortMapRules_3,PortMapRules_4,PortMapRules_5,PortMapRules_6,PortMapRules_7,PortMapRules_8,PortMapRules_9",
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {};
                result.portMapEnable = data.PortMapEnable;
                //from 93, refactory later
                var rules = [];
                if(data.PortMapRules_0 != ""){
                    rules.push([0,data.PortMapRules_0]);
                }
                if(data.PortMapRules_1 != ""){
                    rules.push([1,data.PortMapRules_1]);
                }
                if(data.PortMapRules_2 != ""){
                    rules.push([2,data.PortMapRules_2]);
                }
                if(data.PortMapRules_3 != ""){
                    rules.push([3,data.PortMapRules_3]);
                }
                if(data.PortMapRules_4 != ""){
                    rules.push([4,data.PortMapRules_4]);
                }
                if(data.PortMapRules_5 != ""){
                    rules.push([5,data.PortMapRules_5]);
                }
                if(data.PortMapRules_6 != ""){
                    rules.push([6,data.PortMapRules_6]);
                }
                if(data.PortMapRules_7 != ""){
                    rules.push([7,data.PortMapRules_7]);
                }
                if(data.PortMapRules_8 != ""){
                    rules.push([8,data.PortMapRules_8]);
                }
                if(data.PortMapRules_9 != ""){
                    rules.push([9,data.PortMapRules_9]);
                }
                result.portMapRules = parsePortMapRules(rules);
                return result;
            } else {
                return unknownErrorObject;
            }
        }

        //from 93, refactory later
        function parsePortMapRules(data) {
            var rules = [];
            if(data && data.length > 0){
                for(var i = 0; i < data.length; i++){
                    var aRule = {};
                    var elements = data[i][1].split(",");
                    aRule.index = data[i][0];
                    aRule.sourcePort = elements[1];
                    aRule.destIpAddress = elements[0];
                    aRule.destPort = elements[2];
                    aRule.protocol = transProtocol(elements[3]);
                    aRule.comment = elements[4];
                    rules.push(aRule);
                }
            }
            return rules;
        }
    }

    /**
     * 设置端口映射信息
     * @method setPortMap
     */
    function setPortMap() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "ADD_PORT_MAP";
            requestParams.portMapEnabled = params.portMapEnable;
            requestParams.fromPort = params.sourcePort;
            requestParams.ip_address = params.destIpAddress;
            requestParams.toPort = params.destPort;
            requestParams.protocol = params.protocol;
            requestParams.comment = params.comment;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 启用/禁用端口映射
     * @method enablePortMap
     */
    function enablePortMap() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "ADD_PORT_MAP";
            requestParams.portMapEnabled = params.portMapEnable;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 删除端口映射信息
     * @method deleteMapRules
     */
    function deleteMapRules() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "DEL_PORT_MAP";
            requestParams.delete_id = params.indexs.join(';') + ";";
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取流量提醒数据
     * @method getTrafficAlertInfo
     */
    function getTrafficAlertInfo() {
    	return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
        	return {
        		isTest : isTest,
        		cmd : "data_volume_limit_switch,data_volume_limit_unit,data_volume_limit_size,data_volume_alert_percent,monthly_tx_bytes,monthly_rx_bytes,monthly_time,traffic_alined_delta",
        		multi_data : 1
            };
        }

        function deal(data) {
            if (data) {
            	var isData = data.data_volume_limit_unit == 'data';
            	var result = {
        			dataLimitChecked : data.data_volume_limit_switch,
        			dataLimitTypeChecked : isData ? '1' : '0',
					limitDataMonth : isData ? data.data_volume_limit_size : '0',
					alertDataReach : isData ? data.data_volume_alert_percent : '0',
					limitTimeMonth : isData ? '0' : data.data_volume_limit_size,
					alertTimeReach : isData ? '0' : data.data_volume_alert_percent,
                    monthlySent: data.monthly_tx_bytes == '' ? 0 : data.monthly_tx_bytes,
                    monthlyReceived: data.monthly_rx_bytes == '' ? 0 : data.monthly_rx_bytes,
                    monthlyConnectedTime: data.monthly_time == '' ? 0 : data.monthly_time,
					traffic_alined_delta:data.traffic_alined_delta == ''? 0 : data.traffic_alined_delta
            	};
                return result;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 设置流量提醒
     * @method setTrafficAlertInfo
     */
    function setTrafficAlertInfo(){
    	return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
        	var isData = params.dataLimitTypeChecked == '1';
        	var requestParams = {
    			isTest : isTest,
    			goformId : "DATA_LIMIT_SETTING",
    			data_volume_limit_switch: params.dataLimitChecked
        	};
        	if(params.dataLimitChecked == '1'){
        		requestParams.data_volume_limit_unit = isData ? 'data' : 'time';
				requestParams.data_volume_limit_size = isData ? params.limitDataMonth : params.limitTimeMonth;
				requestParams.data_volume_alert_percent = isData ? params.alertDataReach : params.alertTimeReach;
        	}
        	return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

	/**
	 * 发送USSD命令，获取响应
	 * @method getUSSDResponse
	 */
	function getUSSDResponse(){
		var callback = arguments[1];
		return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
			if(params.sendOrReply=="send"){
				return {
					isTest : isTest,
					goformId : "USSD_PROCESS",
					USSD_operator : params.operator,
					USSD_send_number : params.strUSSDCommand,
					notCallback : true
				};
			}else if(params.sendOrReply=="reply"){
				return {
					isTest : isTest,
					goformId : "USSD_PROCESS",
					USSD_operator: params.operator,
					USSD_reply_number: params.strUSSDCommand,
					notCallback : true
				};
			}
        }

        function deal(data) {
           if(!data){
        		callback(false, "ussd_fail");
        		return;
        	}
        	if (data.result == "success") {
				callbackTemp=callback;
        		getResponse();
			} else {
				callback(false, "ussd_fail");
			}
        }

	}

	/**
	 * 获取响应
	 * @method getResponse
	 */
	function getResponse(){
		$.ajax({
			url : "/goform/goform_get_cmd_process",
			data: {cmd : "ussd_write_flag"},
			cache: false,
			async: true,
			dataType: "json",
			success: function(result){
				if (result.ussd_write_flag == "1" ) {
					callbackTemp(false, "ussd_no_service");
				}else if (result.ussd_write_flag == "4" || result.ussd_write_flag == "unknown" || result.ussd_write_flag == "3") {
					callbackTemp(false, "ussd_timeout");
				}else if (result.ussd_write_flag == "15") {
					setTimeout(getResponse, 1000);
				}else if (result.ussd_write_flag == "10") {
					callbackTemp(false, "ussd_retry");
				}else if (result.ussd_write_flag == "99") {
					callbackTemp(false, "ussd_unsupport");
				}else if (result.ussd_write_flag == "41") {
					callbackTemp(false, "operation_not_supported");
				} else if (result.ussd_write_flag == "2") {
					callbackTemp(false, "network_terminated");
				} else if (result.ussd_write_flag == "16") {
					$.ajax({
						url : "/goform/goform_get_cmd_process",
						data : {cmd : "ussd_data_info"},
						dataType : "json",
						async : true,
						cache : false,
						success : function(data) {
							var content ={};
							content.data = data.ussd_data;
							content.ussd_action = data.ussd_action;
                            content.ussd_dcs = data.ussd_dcs;
							callbackTemp(true, content);
						},
						error:function(){
							callbackTemp(false, "ussd_info_error");
						}
					});
				}else{
					callbackTemp(false, "ussd_fail");
				}
			},
			error: function(){
				callbackTemp(false, "ussd_fail");
			}
		});
	}

	/**
	 * 发送USSD取消命令
	 * @method USSDReplyCancel
	 */
	function USSDReplyCancel(callback){
		$.ajax({
			url : "/goform/goform_set_cmd_process",
			data: {goformId : "USSD_PROCESS", USSD_operator: "ussd_cancel"},
			cache: false,
			dataType: "json",
			success : function(data) {
				if (data.result == "success") {
					getCancelResponse();
				}else{
					callback(false);
				}
			}
		});

		function getCancelResponse(){
			$.ajax({
				url : "/goform/goform_get_cmd_process",
				data: {cmd : "ussd_write_flag"},
				cache: false,
				async: true,
				dataType: "json",
				success: function(result){
					if (result.ussd_write_flag == "15") {
						setTimeout(getCancelResponse, 1000);
					} else if (result.ussd_write_flag == "13") {
						callback(true);
					} else{
						callback(false);
					}
				},
				error: function(){
					callback(false);
				}
			});
		}
	}

    /**
     * 网络解锁
     * @method unlockNetwork
     */
    function unlockNetwork() {
        var callback = arguments[1];
        var checkPoint = 0;
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params) {
            return {
                isTest: isTest,
                goformId: "UNLOCK_NETWORK",
                notCallback: true,
                unlock_network_code: params.unlock_network_code
            };
        }

        function deal(data) {
            if (data && data.result == "success") {
                addCallback(checkUnlockNetworkStatus);
            } else {
                callback({result: 'fail'});
            }
        }

        function checkUnlockNetworkStatus() {
            if (checkPoint > 5) {
                removeCallback(checkUnlockNetworkStatus);
                callback({result: 'fail'});
            } else if (timerInfo.simStatus != 'modem_imsi_waitnck') {
                removeCallback(checkUnlockNetworkStatus);
                callback({result: 'success'});
            }
            checkPoint++;
        }
    }

    /**
     * 获取解锁次数
     * @method getNetworkUnlockTimes
     */
    function getNetworkUnlockTimes() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                cmd:"unlock_nck_time"
            };
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

	/**
     * 设置升级提醒信息
     * @method setUpdateInfoWarning
     */
	function setUpdateInfoWarning(){
		var callback = arguments[1];
		return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params) {
            return {
                isTest : isTest,
				goformId : "SET_UPGRADE_NOTICE",
                upgrade_notice_flag : params.upgrade_notice_flag,
				notCallback : true
            };
        }

        function deal(data) {
            if (data.result=="success") {
                callback(true);
            } else {
                callback(false);
            }
        }
	}

	/**
     * 获取升级提醒信息
     * @method getUpdateInfoWarning
     */
	function getUpdateInfoWarning(){
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                cmd:"upgrade_notice_flag"
            };
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
	}

    /**
     * 获取AP Station基本设置
     * @method getAPStationBasic
     */
    function getAPStationBasic() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data:1,
                cmd:"wifi_sta_connection,pswan_priority,wifiwan_priority,ethwan_priority"
            };
        }

        function deal(data) {
            if (data) {
                return {
                    ap_station_enable:data.wifi_sta_connection,
                    ap_station_mode: parseInt(data.wifiwan_priority, 10) > parseInt(data.pswan_priority, 10) ? "wifi_pref" : "dial_pref"
                }
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取AP Station基本设置
     * @method setAPStationBasic
     */
    function setAPStationBasic() {
        var parameters = arguments[0];
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params) {
            return {
                isTest:isTest,
                goformId:"WIFI_STA_CONTROL",
                wifi_sta_connection:params.ap_station_enable
            };
        }

        function deal(data) {
            if (data && data.result == "success") {
                timerInfo.ap_station_enable = parameters.ap_station_enable == 1;
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 刷新AP Station使能状态到缓存
     * @method refreshAPStationStatus
     * @returns {getAPStationBasic|*}
     */
    function refreshAPStationStatus() {
        return getAPStationBasic({}, function(data){
            timerInfo.ap_station_enable = data.ap_station_enable == 1;
            timerInfo.ap_station_mode = data.ap_station_mode;
        });
    }

    /**
     * 获取预置和保存的热点列表
     * @method getHotspotList
     */
    function getHotspotList() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var cmdStr = "wifi_profile_num,wifi_profile";
            for(var i = 1; i < config.AP_STATION_LIST_LENGTH; i++){
                cmdStr = cmdStr + ",wifi_profile" + i;
            }
            return {
                isTest:isTest,
                multi_data:1,
                cmd: cmdStr
            };
        }

        function deal(data) {
            if (data) {
                var wifiList = [];
                for (var i = 0; i < config.AP_STATION_LIST_LENGTH; i++) {
                    var wifiStr = "";
                    if (i == 0) {
                        wifiStr = data.wifi_profile;
                    } else {
                        wifiStr = data["wifi_profile" + i];
                    }
                    var wifiArray = wifiStr.split(";");
                    for (var j = 0; j < wifiArray.length; j++) {
                        var item = wifiArray[j].split(",");
                        if (!item[0]) {
                            break;
                        }
                        var wifiJson = {
                            profileName:item[0],
                            fromProvider:item[1],
                            connectStatus:item[2],
                            signal:item[3],
                            ssid:item[4],
                            authMode:item[5],
                            encryptType:item[6],
                            password:item[7]=="0"?"":item[7],
                            keyID:item[8],
                            mac:item[9]
                        };
                        wifiList.push(wifiJson);
                    }
                }

                return { hotspotList:wifiList };

            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 搜索热点
     * @method searchHotspot
     */
    function searchHotspot() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params) {
            return {
                isTest:isTest,
                goformId:"WLAN_SET_STA_REFRESH"
            };
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取搜寻到的热点列表
     * @method getSearchHotspotList
     */
    function getSearchHotspotList() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data:1,
                cmd:"scan_finish,EX_APLIST,EX_APLIST1"
            }
        }

        function deal(data) {
            if (data) {
                if (data.scan_finish == "0") {
                    return { scan_finish:"0", hotspotList:[] };
                }
				if (data.scan_finish == "2") {
                    return { scan_finish:"2", hotspotList:[] };
                }
                var wifiList = [];
                for (var i = 0; i <= 1; i++) {
                    var wifiStr;
                    if (i == 0) {
                        wifiStr = data.EX_APLIST;
                    } else {
                        wifiStr = data.EX_APLIST1;
                    }
                    var wifiArray = wifiStr.split(";");
                    for (var j = 0; j < wifiArray.length; j++) {
                        var item = wifiArray[j].split(",");
                        if (!item[0]) {
                            break;
                        }
                        var wifiJson = {
                            fromProvider:item[0],
                            connectStatus:item[1],
                            ssid:item[2],
                            signal:item[3],
                            channel:item[4],
                            authMode:item[5],
                            encryptType:item[6],
                            mac:item[7]
                        }
                        wifiList.push(wifiJson);
                    }
                }

                return {scan_finish:"1", hotspotList:wifiList };

            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 将热点信息组成字符串
     * @method creatHotspotString
     */
    function creatHotspotString(hotspot) {
        var item = [];
        item.push(hotspot.profileName);
        item.push(hotspot.fromProvider || "0");
        item.push(hotspot.connectStatus || "0");
        item.push(hotspot.signal);
        item.push(hotspot.ssid);
        item.push(hotspot.authMode);
        item.push(hotspot.encryptType);
        item.push(hotspot.password || "0");
        item.push(hotspot.keyID);
        item.push(hotspot.mac);
        return item.join(",");
    }

    /**
     * 保存热点
     * @method saveHotspot
     */
    function saveHotspot() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params) {
            var apList = params.apList;
            var action = "modify";
            if (params.profileName == "") {
                action = "add";
                var newName = ( jQuery.fn.jquery + Math.random() ).replace(/\D/g, "");
                params.profileName = newName;
                apList.push({
                    profileName:newName,
                    fromProvider:"0",
                    connectStatus:"0",
                    signal:params.signal,
                    ssid:params.ssid,
                    authMode:params.authMode,
                    encryptType:params.encryptType,
                    password:params.password || "0",
                    keyID:params.keyID,
					mac:params.mac
                });
            }

            var wifi = {"profile0":[]};
            for(var i = 1; i < config.AP_STATION_LIST_LENGTH; i++){
                wifi["profile" + i] = [];
            }

            var activeHotspotStr = "";
            for (var i = 0; i < apList.length; i++) {
                var hotspotStr = "";
                if (params.profileName == apList[i].profileName) {
                    hotspotStr = creatHotspotString(params);
                    activeHotspotStr = hotspotStr;
                } else {
                    hotspotStr = creatHotspotString(apList[i]);
                }
                var index = parseInt(i % 10);
                wifi["profile" + index].push(hotspotStr);
            }
            var profileParams = {wifi_profile:wifi.profile0.join(";")};
            for(var i = 1; i < config.AP_STATION_LIST_LENGTH; i++){
                profileParams["wifi_profile" + i] = wifi["profile" + i].join(";");
            }
            var requestParams = $.extend({
                isTest:isTest,
                goformId: "WIFI_SPOT_PROFILE_UPDATE",
                wifi_profile_num:apList.length,
                wifi_update_profile:activeHotspotStr,
                action:action
            }, profileParams);
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 删除热点
     * @method deleteHotspot
     */
    function deleteHotspot() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params) {
            var apList = params.apList;
            var wifi = {"profile0":[]};
            for(var i = 1; i < config.AP_STATION_LIST_LENGTH; i++){
                wifi["profile" + i] = [];
            }
			var foundDelete = false;
            var activeHotspotStr = "";
            for (var i = 0; i < apList.length; i++) {
                var hotspotStr = creatHotspotString(apList[i]);
                if (apList[i].profileName == params.profileName) {
                    foundDelete = true;
                    activeHotspotStr = hotspotStr;
                    continue;
                }
                var idIndex = i;
                if (foundDelete) {
                    idIndex = i - 1;
                }
                var index = parseInt(idIndex % 10);
                wifi["profile" + index].push(hotspotStr);
            }
            var num = foundDelete ? apList.length - 1 : apList.length;

            var profileParams = {wifi_profile:wifi.profile0.join(";")};
            for(var i = 1; i < config.AP_STATION_LIST_LENGTH; i++){
               profileParams["wifi_profile" + i] = wifi["profile" + i].join(";");
            }
            var requestParams = $.extend({
                isTest : isTest,
                goformId : "WIFI_SPOT_PROFILE_UPDATE",
                wifi_profile_num : num,
                wifi_update_profile : activeHotspotStr,
                action : "delete"
            }, profileParams);
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 链接热点
     * @method connectHotspot
     */
    function connectHotspot() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params) {
            return {
                isTest:isTest,
                goformId:"WLAN_SET_STA_CON",
                EX_SSID1:params.EX_SSID1,
                EX_AuthMode:params.EX_AuthMode,
                EX_EncrypType:params.EX_EncrypType,
                EX_DefaultKeyID:params.EX_DefaultKeyID,
                EX_WEPKEY:params.EX_WEPKEY,
                EX_WPAPSK1:params.EX_WPAPSK1,
                EX_wifi_profile:params.EX_wifi_profile,
                EX_mac:params.EX_mac
            };
        }

        function deal(data) {
            if (data && (data.result == "success" || data.result == "processing")) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 断开热点
     * @method disconnectHotspot
     */
    function disconnectHotspot() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params) {
            return {
                isTest:isTest,
                goformId:"WLAN_SET_STA_DISCON"
            };
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

	/**
     * 获取RJ45基本状态信息
     * @method getOpMode
	 * @return {Object} JSON 参数对象
     */
	function getOpMode(){
		 return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data:1,
                cmd:"blc_wan_mode,blc_wan_auto_mode,loginfo,ppp_status,rj45_state,ethwan_mode,NV_USE_TW_MACH_SIM_LOCK"
            };
        }

        function deal(data) {
            if (data) {
				var result = {};
				if(data.blc_wan_mode == 'AUTO'){
                    result.blc_wan_mode = data.blc_wan_auto_mode ? data.blc_wan_auto_mode : 'AUTO_PPP';
                }else{
                    result.blc_wan_mode = data.blc_wan_mode ? data.blc_wan_mode : 'PPP';
                }
                result.loginfo = data.loginfo;
                result.ppp_status = data.ppp_status;
                result.rj45_state = (typeof data.rj45_state == 'undefined' || data.rj45_state == '') ? 'dead' : data.rj45_state;
				result.ethwan_mode = data.ethwan_mode.toUpperCase();
                result.CONFIG_USE_TW_MACH_SIM_LOCK = data.NV_USE_TW_MACH_SIM_LOCK=="yes"? true : false;
                return result;
            } else {
                return unknownErrorObject;
            }
        }
	}

	/**
     * 获取RJ45网线状态信息
     * @method getRj45PlugState
	 * @return {Object} JSON 参数对象
	 * @example
	 * { rj45_plug: "wan_lan_off" }
     */
	function getRj45PlugState(){
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                cmd:"rj45_plug"
            };
        }

        function deal(data) {
            if (data) {
				var result = {};
				result.rj45_plug = data.rj45_plug == "" ? "wan_lan_off" : data.rj45_plug;
                return result;
            } else {
                return unknownErrorObject;
            }
        }
	}

	function checkOpMode(opmode, rj45state){
		if(config.RJ45_SUPPORT){
			if(rj45state == "dead" || rj45state == ""){
				return 'PPP';
			}else if(!opmode || opmode == "undefined"){
				if(rj45state == "working"){
					return 'PPPOE';
				}else{
					return 'PPP';
				}
			}else{
				return opmode;
			}
		}else{
			return 'PPP';
		}
	}

	/**
     * 模式切换设置
     * @method SetOperationMode
	 * @param {Object} params json参数对象
	 * @param {function} callback 获取到结果后的回调函数
     */
	function SetOperationMode(params, callback){
		return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params) {
			var requestParams = $.extend({
				isTest:isTest,
                goformId: "OPERATION_MODE"
			}, params);
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
	}

	/**
     * 获取RJ45有线网络状态信息
     * @method getPppoeParams
	 * @param {Object} params json参数对象
	 * @return {Object} JSON 参数对象
     */
	function getPppoeParams(){
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data:1,
                cmd:"opms_wan_auto_mode,ethwan_mode,pppoe_username,pppoe_password,ethwan_dialmode,ppp_status,static_wan_ipaddr,static_wan_netmask,static_wan_gateway,static_wan_primary_dns,static_wan_secondary_dns,rj45_state,lan_ipaddr,lan_netmask"
            };
        }

        function deal(data) {
            if (data) {
                return {
                    opms_wan_auto_mode:data.opms_wan_auto_mode,
                    ethwan_mode: data.ethwan_mode.toUpperCase(),
                    pppoe_username: data.pppoe_username,
                    pppoe_password: data.pppoe_password,
                    ethwan_dialmode: data.ethwan_dialmode == "manual" ? "manual_dial" : "auto_dial",
                    ppp_status: data.ppp_status,
                    static_wan_ipaddr: data.static_wan_ipaddr,
                    static_wan_netmask: data.static_wan_netmask,
                    static_wan_gateway: data.static_wan_gateway,
                    static_wan_primary_dns: data.static_wan_primary_dns,static_wan_secondary_dns: data.static_wan_secondary_dns,
                    rj45_state: (typeof data.rj45_state == 'undefined' || data.rj45_state == '') ? 'dead' : data.rj45_state,
                    lan_ipaddr: data.lan_ipaddr,
                    lan_netmask: data.lan_netmask
                }
            } else {
                return unknownErrorObject;
            }
        }
	}

	/**
     * 设置RJ45有线网络模式
     * @method setPppoeDialMode
	 * @param {Object} params json参数对象
	 * @param {function} callback 获取到结果后的回调函数
     */
	function setPppoeDialMode(params, callback){
		return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params) {
			var requestParams = $.extend({
				isTest:isTest,
				notCallback: true
			}, params);
            return requestParams;
        }

        function deal(data) {
           if (data.result == "success") {
					callback({
						result: true
					});
			} else {
				callback({
					result : false
				});
			}
        }
	}

	/**
     * 获取SNTP信息
     * @method getSntpParams
	 * @param {Object} params json参数对象
	 * @param {function} callback 获取到结果后的回调函数
     */
	function getSntpParams(params, callback){
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data:1,
                cmd:"sntp_year,sntp_month,sntp_day,sntp_hour,sntp_minute,sntp_second,sntp_time_set_mode,sntp_static_server0,sntp_static_server1,sntp_static_server2,sntp_server0,sntp_server1,sntp_server2,sntp_server3,sntp_server4,sntp_server5,sntp_server6,sntp_server7,sntp_server8,sntp_server9,sntp_other_server0,sntp_other_server1,sntp_other_server2,sntp_timezone,sntp_timezone_index,sntp_dst_enable,ppp_status,sntp_process_result,rj45_state"
            };
        }

        function deal(data) {
            if (data) {
				var sntp_servers = getSntpServers(data);
                return {
                    sntp_year: data.sntp_year,
					sntp_month: data.sntp_month,
					sntp_day: data.sntp_day,
					sntp_hour: data.sntp_hour,
					sntp_minute: data.sntp_minute,
					sntp_second: data.sntp_second,
					sntp_time_set_mode: data.sntp_time_set_mode,
					sntp_servers: sntp_servers,
					sntp_server0: data.sntp_server0,
					sntp_server1: data.sntp_server1,
					sntp_server2: data.sntp_server2,
					sntp_other_server0: data.sntp_other_server0,
					sntp_other_server1: data.sntp_other_server1,
					sntp_other_server2: data.sntp_other_server2,
					sntp_timezone: data.sntp_timezone,
					sntp_timezone_index: data.sntp_timezone_index ? data.sntp_timezone_index : "0",
					sntp_dst_enable: data.sntp_dst_enable,
					ppp_status: data.ppp_status,
					blc_wan_mode: timerInfo.blc_wan_mode,//opms_wan_mode: checkOpMode(data.opms_wan_mode, data.rj45_state),
					sntp_process_result: data.sntp_process_result,
					rj45_state: (typeof data.rj45_state == 'undefined' || data.rj45_state == '') ? 'dead' : data.rj45_state
                }
            } else {
                return unknownErrorObject;
            }
        }

		function getSntpServers(data) {
			var serverArray = [];

			for(var i =0; i < 3; i++){
				var tmp = "sntp_static_server" + (i).toString();
				if(data[tmp] != "") {
					var obj = {};
					obj.name = data[tmp];
					obj.value = data[tmp];
					serverArray.push(obj);
				}
			}
			var otherArray = [{name: "Other", value: "Other"}, {name: "NONE", value: ""}];
			for(var j=0; j< 2 ; j++){
				serverArray.push(otherArray[j]);
			}
			return serverArray;
		}
	}

	/**
     * 设置手动时间校准
     * @method setSNTPDate
	 * @param {Object} params json参数对象
	 * @param {function} callback 获取到结果后的回调函数
     */
	function setSNTPDate(params, callback){
		return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params) {
			var requestParams = $.extend({
				isTest:isTest
			}, params);
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
	}

        function setTimeToPC(params, callback) {
            return doStuff(arguments, {}, prepare, deal, null, true);
    
            function prepare(params, isPost) {
                var requestParams = {
                    isTest: isTest,
                    goformId: "SNTP_TIME_WEBSYNC",
                    pctime: params.time
                };
                return requestParams;
            }
    
            function deal(data) {
                if (data && data.result == 'success') {
                    return data;
                } else {
                    return unknownErrorObject;
                }
            }
        }
	/**
     * 设置SNTP校准信息
     * @method setSntpSetting
	 * @param {Object} params json参数对象
	 * @param {function} callback 获取到结果后的回调函数
     */
	function setSntpSetting(params, callback){
		var requestParams = $.extend({
			isTest:isTest
		}, params);
		if(requestParams.isTest){
			result = simulate.simulateRequest(params, callback, callback, true, true);
			setTimeout(function() {callback(result);}, getRandomInt(120) + 50);
		} else {
			$.post("goform/goform_set_cmd_process", requestParams, function(data){
				if (data && data.result == "success") {
					if(params.manualsettime == "auto") {
						setTimeout(checkSyncStatus, 2000);
						callback(data);
					}else {
						callback(true);
					}
				} else if(data && data.result == "processing"){
					callback(data);
				}else {
					callback(false);
				}
			}, "json");
		}

		function checkSyncStatus() {
			$.ajax({
				url : "goform/goform_get_cmd_process",
				dataType : "json",
				data : {cmd : "sntp_process_result"},
				cache : false,
				async : false,
				success : function(data){
					if(data.sntp_process_result == "failure") {
						callback(false);
					} else if(data.sntp_process_result == "success") {
						callback(true);
					} else {
						setTimeout(checkSyncStatus, 2000);
					}
				},
				error : function(){
					callback(false);
				}
			});
		}
	}

	/**
     * 添加URL过滤规则
     * @method addUrlFilterRule
	 * @param {Object} params json参数对象
	 * @param {function} callback 获取到结果后的回调函数
     */
	function addUrlFilterRule(params, callback) {
		return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params) {
			var requestParams = $.extend({
				isTest:isTest
			}, params);
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
	}

	/**
     * 获取URL过滤规则列表
     * @method getUrlFilterList
	 * @return {Object} params json参数对象
     */
	function getUrlFilterList() {
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                cmd:"websURLFilters"
            };
        }

        function deal(data) {
			var urlFilterRules = [];
            if (data) {
				if(data.websURLFilters.length == 0) {
					return {urlFilterRules: []};
				} else {
					var tempArray = data.websURLFilters.split(";");
					for(var i = 0; i < tempArray.length; i++){
						var aRule = {};
						aRule.index = i;
						aRule.url = tempArray[i];
						urlFilterRules.push(aRule);
					}
					return {urlFilterRules: urlFilterRules};
				}
            } else {
                return unknownErrorObject;
            }
        }
	}

	/**
     * 删除URL过滤规则
     * @method deleteSelectedRules
	 * @param {Object} params json参数对象
	 * @param {function} callback 获取到结果后的回调函数
     */
	function deleteSelectedRules(params, callback) {
		return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params) {
			var requestParams = $.extend({
				isTest:isTest
			}, params);
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
	}

	/**
     * 获取WDS信息
     * @method getWdsInfo
	 * @return {Object} params json参数对象
     */
	function getWdsInfo() {
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
				multi_data: "1",
                cmd:"wifi_wds_mode,wifi_wds_ssid,wifi_wds_AuthMode,wifi_wds_EncrypType,wifi_wds_WPAPSK1,wifi_cur_state "
            };
        }

        function deal(data) {
            if (data) {
				return {
				currentMode : data.wifi_wds_mode,
				wdsSSID : data.wifi_wds_ssid,
				wdsAuthMode : data.wifi_wds_AuthMode,
				wdsEncrypType : data.wifi_wds_EncrypType,
				wdsWPAPSK1 : data.wifi_wds_WPAPSK1,
				RadioOff : data.wifi_cur_state == "1" ? "1" : "0"
				};
            } else {
                return unknownErrorObject;
            }
        }
	}

	/**
     * WDS设置
     * @method setWDS
	 * @param {Object} params json参数对象
	 * @param {function} callback 获取到结果后的回调函数
     */
	function setWDS(params, callback){
		return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params) {
			var requestParams = $.extend({
				isTest:isTest
			}, params);
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
	}

	/**
     * 获取系统LOG
     * @method getSyslogInfo
	 * @return {Object} params json参数对象
     */
	function getSyslogInfo() {
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
				multi_data: "1",
                cmd:"syslog_mode,debug_level"
            };
        }

        function deal(data) {
            if (data) {
				return {
				currentMode : data.syslog_mode,
				debugLevel : data.debug_level
				};
            } else {
                return unknownErrorObject;
            }
        }
	}

	/**
     * 设置系统LOG
     * @method setSysLog
	 * @param {Object} params json参数对象
	 * @param {function} callback 获取到结果后的回调函数
     */
	function setSysLog(params, callback) {
		return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params) {
			var requestParams = $.extend({
				isTest:isTest
			}, params);
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
	}

	function getVoipSettings() {
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
				multi_data: "1",
                cmd:"voip_sip_outbound_enable,voip_sip_outbound_server,voip_sip_outbound_port,voip_sip_stun_enable,voip_sip_stun_server,voip_sip_register_time,voip_sip_port,voip_sip_rtp_port_min,voip_sip_rtp_port_max"
            };
        }

        function deal(data) {
            if (data) {
				return {
				outboundEnable : data.voip_sip_outbound_enable,
				outboundServer : data.voip_sip_outbound_server,
				outboundPort: data.voip_sip_outbound_port,
				stunModeEnable: data.voip_sip_stun_enable,
				stunServer: data.voip_sip_stun_server,
				registerTime: data.voip_sip_register_time,
				sipPort: data.voip_sip_port,
				rtpPortMin: data.voip_sip_rtp_port_min,
				rtpPortMax: data.voip_sip_rtp_port_max
				};
            } else {
                return unknownErrorObject;
            }
        }
	}

	function setVoipSettings(params, callback) {
		return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params) {
			var requestParams = $.extend({
				isTest:isTest
			}, params);
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
	}

	function getVoipUserDetails() {
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
				multi_data: "1",
                cmd:"voip_sip_register_server1,voip_sip_domain1,voip_sip_realm1,voip_sip_proxy_enable1,voip_sip_proxy_server1,voip_account_display_account1,voip_account_auth1,voip_account_password1,voip_user1_register_status"
            };
        }

        function deal(data) {
            if (data) {
				return {
				sipRegisterServer : data.voip_sip_register_server1,
				sipDomain : data.voip_sip_domain1,
				sipRealm: data.voip_sip_realm1,
				sipProxyMode: data.voip_sip_proxy_enable1,
				voipSipProxyServer: data.voip_sip_proxy_server1,
				displayName: data.voip_account_display_account1,
				authorizedUserName: data.voip_account_auth1,
				authorizedPassword: data.voip_account_password1,
				voipRegisterStatus: data.voip_user1_register_status
				};
            } else {
                return unknownErrorObject;
            }
        }
	}

	function getVoipUserRegisterStatus() {
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                cmd:"voip_user1_register_status"
            };
        }

        function deal(data) {
            if (data) {
				return {
				voipRegisterStatus: data.voip_user1_register_status
				};
            } else {
                return unknownErrorObject;
            }
        }
	}

	function setVoipUserDetails() {
		return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params) {
			var requestParams = $.extend({
				isTest:isTest
			}, params);
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
	}


    function getVoipAdvancedSettings() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data: "1",
                cmd:"voip_sip_t38_enable1,voip_sip_dtmf_method,voip_sip_encoder1,voip_sip_vad_enable1,voip_sip_cng_enable1"
            };
        }

        function deal(data) {
            if (data) {
                return {
                    sipT38Mode : data.voip_sip_t38_enable1,
                    currentDtmfMethod : data.voip_sip_dtmf_method,
                    currentVoipSipEncoderMethod: data.voip_sip_encoder1,
                    sipVadMode: data.voip_sip_vad_enable1,
                    sipCngMode: data.voip_sip_cng_enable1
                };
            } else {
                return unknownErrorObject;
            }
        }
    }
    function setVoipAdvancedSettings() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params) {
            var requestParams = $.extend({
                isTest:isTest

            }, params);
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }
    function getVoipSupplementaryService() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data: "1",
                cmd:"voip_forwarding_model,voip_forwarding_uri1,voip_not_disturb_enable,voip_call_waiting_in_enable"
            };
        }

        function deal(data) {
            if (data) {
                return {
                    selectedMode : data.voip_forwarding_model,
                    voipForwardingUri : data.voip_forwarding_uri1,
                    sipProtocolIncomingCallMode: data.voip_not_disturb_enable,
                    sipProtocolCallWaitingMode: data.voip_call_waiting_in_enable
                };
            } else {
                return unknownErrorObject;
            }
        }
    }

    function setVoipSupplementaryService() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params) {
            var requestParams = $.extend({
                isTest:isTest

            }, params);
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

	/**
     * 获取WiFi MAC过滤信息
     * @method getMacFilterInfo
	 * @return {Object} params json参数对象
     */
	function getMacFilterInfo() {
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data: "1",
				cmd:"ACL_mode,wifi_mac_black_list,wifi_hostname_black_list,wifi_cur_state,user_ip_addr,client_mac_address,wifi_mac_white_list"
            };
        }

        function deal(data) {
            if (data) {
                return {
                    ACL_mode : data.ACL_mode,
                    wifi_mac_black_list : data.wifi_mac_black_list,
                    wifi_hostname_black_list : data.wifi_hostname_black_list,
                    RadioOff : data.wifi_cur_state == "1" ? "1" : "0",
                    user_ip_addr : data.user_ip_addr,
                    client_mac_address : data.client_mac_address,
                    wifi_mac_white_list : data.wifi_mac_white_list
                };
            } else {
                return unknownErrorObject;
            }
        }
	}

	/**
     * 设置WiFi MAC过滤信息
     * @method setMacFilter
	 * @return {Object} params json参数对象
     */
	function setMacFilter() {
		return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params) {
			var requestParams = $.extend({
                goformId: 'WIFI_MAC_FILTER',
                isTest:isTest
            }, params);
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }
    // 用来确定显示哪个图片logo
    function getLogoCust() {
        return doStuff(arguments, {}, prepare, deal, null, false);
        function prepare() {
            var param = {
                cmd: 'product_logo',
                isTest: false
            }
            return param;
        }
        function deal(data) {
            return data ? data : unknownErrorObject;
        }
    }
    // 用来获取模拟用户名
    function custAdminPsw() {
        return doStuff(arguments, {}, prepare, deal, null, false);
        function prepare() {
            var param = {
                cmd: 'cust_admin_psw',
                isTest: false
            }
            return param;
        }
        function deal(data) {
            return data;
        }
    }
    function custEnableWebuiMenu() {
        return doStuff(arguments, {}, prepare, deal, null, false);
        function prepare() {
            var param = {
                cmd: 'cust_webui_menu',
                isTest: false
            }
            return param;
        }
        function deal(data) {
            console.log(data);
            if (data.cust_webui_menu == "") {
                data.cust_webui_menu = '["0"]'
            }
            var str = data.cust_webui_menu
            str = str.substring(2, str.length -2)
            str = str.split('},{')
            var str_list = []
            str.forEach(element => {
                var arr = element.split(':')
                var k = arr[0]
                str_list.push({ [k] : arr[1]})
            });
            data.cust_webui_menu = str_list
            console.log(data);
            return data;
        }
    }
    /**
       * 断线检测页面的参数请求函数
       * @method getDetection
       */
    function getDetection() {
        return doStuff(arguments, {}, prepare, deal, null, false);
        function prepare() {
            var params = {
                isTest: false,
                cmd: 'net_selfcheck,net_selfcheck_ip,net_selfcheck_interval,net_selfcheck_trytimes',
                multi_data: 1
            }
            return params;
        }

        function deal(data) {
            return (data ? data : unknownErrorObject);
        }
    }
    /**
   * 设置断线重连参数
   * @method setDetection
   */
    function setDetection() {
        return doStuff(arguments, {}, prepare, deal, null, true);
        function prepare(params, isPost) {
            var postParams = {
                isTest: false,
                goformId: 'tw_net_selfcheck'
            }
            $.extend(postParams, params);
            return postParams;
        }
        function deal(res) {
            return res ? res : unknownErrorObject;
        }
    }
    /**
     * 获取快速开机设置
     * @method getFastbootSetting
     */
    function getFastbootSetting() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params) {
            return {
                isTest: isTest,
                cmd: "mgmt_quicken_power_on,need_hard_reboot,need_sim_pin",
                multi_data: 1
            };
        }

        function deal(data) {
            return {
                fastbootEnabled: data.mgmt_quicken_power_on == '1' ? '1' : '0',
                need_hard_reboot: data.need_hard_reboot,
                need_sim_pin: data.need_sim_pin == 'yes' ? 'yes' : 'no'
            };
        }
    }

    /**
     * 设置快速开机信息
     * @method setFastbootSetting
	 * @param {Object} params json参数对象
     */
    function setFastbootSetting() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params) {
            return {
                isTest: isTest,
                goformId: "MGMT_CONTROL_POWER_ON_SPEED",
                mgmt_quicken_power_on: params.fastbootEnabled
            };
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }
    /**
     * 关闭设备
     * @method turnOffDevice
     */
    function turnOffDevice() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "TURN_OFF_DEVICE";
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }
	 /**
     * 重启设备
     * @method restart
     */
    function restart() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "REBOOT_DEVICE";
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }
     /**
     * 获取OTA新版本信息
     * @method getNewVersionState
     * @return {Object} JSON 对象
     */
    function  getNewVersionState() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "fota_new_version_state,fota_current_upgrade_state,fota_package_already_download";
	    requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var hasNewVersion = (data.fota_new_version_state == 'has_critical' || data.fota_new_version_state == 'has_optional' ||data.fota_new_version_state == 'already_has_pkg');
                data.hasNewVersion = hasNewVersion;
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }


    /**
     * 获取OTA强制升级状态
     * @method getMandatory
     * @return {Object} JSON 对象
     */
    function  getMandatory() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            if (config.UPGRADE_TYPE == "OTA") {
                requestParams.cmd = "is_mandatory";
            } else {
                requestParams.cmd = "fota_new_version_state";
            }
            return requestParams;
        }

        function deal(data) {
            if (data) {
                if (config.UPGRADE_TYPE == "OTA") {
                    return {"is_mandatory": data.is_mandatory == "1"};
                } else {
                    return {"is_mandatory": data.fota_new_version_state == "has_critical"};
                }
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取OTA升级结果
     * @method getUpgradeResult
     * @return {Object} JSON 对象
     */
    function  getUpgradeResult() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "upgrade_result";
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }
    /**
     * 获取OTA升级状态
     * @method getCurrentUpgradeState
     * @return {Object} JSON 对象
     */
    function  getCurrentUpgradeState() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "fota_current_upgrade_state";
            return requestParams;
        }

        function deal(data) {
            if (data) {
		data.current_upgrade_state = data.fota_current_upgrade_state;
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取OTA下载状态
     * @method getPackSizeInfo
     * @return {Object} JSON 对象
     */
    function  getPackSizeInfo() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "fota_pkg_total_size,fota_dl_pkg_size";
	    requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }
    /**
	 * 获取login_need_input_username的值，判断是否需要用户名的输入框
	 * @method needUsername
	 *
	 */
	function needUsername(){
		return doStuff(arguments, {}, prepare, deal, null, false);
		function prepare(params, isPost){
			var requestParam = {
				isTest: isTest,
				cmd: 'login_need_input_username',
				multi_data: 1
			};
			return requestParam;
		}
		function deal(data){
			//data = {login_need_input_username: 'yes'};
			if(data) {
				return data;
			}else{
				return unknownErrorObject;
			}
		}
	}
	/**
	 * 获取dtu_need_display的值，如果为yes就显示，其他不显示
	 * @method dtuDisplay
	 */
	function dtuDisplay(){
		return doStuff(arguments, {}, prepare, deal, null, false);
		function prepare(params, isPost){
			var requestParam = {
				isTest: isTest,
				cmd: 'dtu_need_display',
				multi_data: 1
			};
			return requestParam;
		}
		function deal(data){
			// data = {dtu_need_display: 'yes'};
			if(data){
				return data;
			}else{
				return unknownErrorObject;
			}
		}
	}

	/**
     *用户选择是否进行升级和升级中取消
     * @method setUpgradeSelectOp
	 * @param {Object} params json参数对象
     */
    function setUpgradeSelectOp() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.goformId = "IF_UPGRADE";
            requestParams.isTest = isTest;
            requestParams.select_op = params.selectOp;
            if(requestParams.select_op == 'check'){
                requestParams.ota_manual_check_roam_state = 1;
            }
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }
    /**
     * 获取OTA配置信息
     * @method getOTAUpdateSetting
     * @return {Object} JSON 对象
     */
    function getOTAUpdateSetting() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "fota_updateMode,fota_updateIntervalDay,fota_allowRoamingUpdate";
	    requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return {
                    updateMode:data.fota_updateMode,
                    updateIntervalDay:data.fota_updateIntervalDay,
                    allowRoamingUpdate:data.fota_allowRoamingUpdate
                };
            } else {
                return unknownErrorObject;
            }
        }
    }

	/**
     * 设置OTA配置信息
     * @method setOTAUpdateSetting
	 * @param {Object} params json参数对象
     */
    function setOTAUpdateSetting() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "SetUpgAutoSetting";
            requestParams.UpgMode = params.updateMode;
            requestParams.UpgIntervalDay = params.updateIntervalDay;
            requestParams.UpgRoamPermission = params.allowRoamingUpdate;

            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取DTU页面的初始参数
     * @method getDTUParams
     */
    function getDTUParams(){
        return doStuff(arguments, {}, prepare, deal, null, false);
        function prepare(params, isPost){
            var requestParams = {};
            requestParams.isTest = false;
            requestParams.cmd = "isDtuOn,server1_ip,server1_port,currentMode,heartbeat_interval,heartbeat,baudRate,dataBit,checkDigit,stopBit";
            requestParams.multi_data = 1;
            return requestParams;
        }
        function deal(data) {
            if (data) {
                return {
					isDtuOn: data.isDtuOn,
                    server1_port: data.server1_port,
                    server1_ip: data.server1_ip,
                    currentMode: data.currentMode,
                    heartbeat_interval: data.heartbeat_interval,
                    heartbeat: data.heartbeat,
                    baudRate: data.baudRate,
                    dataBit: data.dataBit,
                    checkDigit: data.checkDigit,
                    stopBit: data.stopBit
                };
            } else {
                return unknownErrorObject;
            }
        }
    }


	/**
     * 设置OTA最近一次升级时间信息
     * @method setOTAUpdateSetting
     */
    function getOTAlastCheckTime(){
        return getParams({nv: ['dm_last_check_time']}, arguments[1], arguments[2]);
    }

	/**
     * 获取信号强度
     * @method setOTAUpdateSetting
     */
    function getSignalStrength(){
        return getParams({nv: ['network_type','sub_network_type', 'rssi', 'rscp', 'lte_rsrp']}, arguments[1], arguments[2]);
    }

    /**
     * 清除升级结果
     * @method setOTAUpdateSetting
     */
    function clearUpdateResult(){
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "RESULT_RESTORE";
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

	/**
	 *
	 *
	 */
	/**
	 * 获取儿童组设备列表
	 * @method childGroupList
	 */
	function childGroupList(){
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {
                isTest: isTest,
                cmd: "childGroupList"
            };
            return requestParams;
        }

        function deal(data) {
            if (data && (data.childGroupList || data.devices)) {
                return isTest ? data.childGroupList: data;
            } else {
                return {devices: []};
            }
        }
    }

    /**
     * 添加到儿童组设备列表
     * @method addChildGroup
	 * @param {Object} params json参数对象，需要添加的设备信息
	 * @param {function} callback 成功回调函数
     */
    function addChildGroup(){
        return doStuff(arguments, config.currentUserInChildGroup == false ? {} : {errorType: 'no_auth'}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {
                isTest: isTest,
                goformId: "ADD_DEVICE",
                mac: params.macAddress
            };
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == 'success') {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 从儿童组设备列表中去除
     * @method removeChildGroup
	 * @param {Object} params json参数对象 ，删除的设备信息
	 * @param {function} callback 成功回调函数
     */
    function removeChildGroup(){
        return doStuff(arguments, config.currentUserInChildGroup == false ? {} : {errorType: 'no_auth'}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {
                isTest: isTest,
                goformId: "DEL_DEVICE",
                mac: params.mac
            };
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == 'success') {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 检查是否在儿童组设备列表中
     * @method checkCurrentUserInChildGroup
	 * @param {Object} params json参数对象 ，被检查的设备信息
	 * @return {Object} JSON
	 * @example {result: true}
     */
    function checkCurrentUserInChildGroup(devices) {
        if (typeof config.currentUserInChildGroup == "undefined") {
            var childGroupDevice = [];
            if (typeof devices != "undefined") {
                childGroupDevice = devices;
            } else {
                childGroupDevice = childGroupList({}).devices;
            }
            var userMacAddr = getUserMacAddr({}).get_user_mac_addr;
            var found = _.find(childGroupDevice, function (item) {
                return item.mac == userMacAddr;
            });
            config.currentUserInChildGroup = typeof found != 'undefined';
            return {result: typeof found != 'undefined'};
        }
        return {result: config.currentUserInChildGroup};
    }

    /**
     * 获取用户MAC信息
     * @method getUserMacAddr
     */
    function getUserMacAddr() {
        return getParams({nv: 'get_user_mac_addr'}, arguments[1], arguments[2]);
    }

    /**
     * 获取已连接设备名称列表
     * @method getHostNameList
     */
    function getHostNameList(){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {
                isTest: isTest,
                cmd: "hostNameList"
            };
            return requestParams;
        }

        function deal(data) {
            if (data && (data.hostNameList || data.devices)) {
                return isTest ? data.hostNameList : data;
            } else {
                return {devices: []};
            }
        }
    }

	/**
     * 修改已连接设备名称
     * @method editHostName
	 * @param {Object} params JSON参数对象 ，被修改的设备信息
     */
    function editHostName(){
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {
                isTest: isTest,
                goformId: "EDIT_HOSTNAME",
                mac: params.mac,
                hostname: params.hostname
            };
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == 'success') {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

	/**
     * 获取白名单列表
     * @method getSiteWhiteList
	 * @return {Object}  JSON
     */
    function getSiteWhiteList(){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {
                isTest: isTest,
                cmd: "site_white_list"
            };
            return requestParams;
        }

        function deal(data) {
            if (data && (data.site_white_list || data.siteList)) {
                return isTest ? data.site_white_list: data;
            } else {
                return {siteList: []};
            }
        }
    }

	/**
     * 从网站白名单列表中移除
     * @method removeSiteWhite
	 * @param {Object} params JSON参数对象
     */
    function removeSiteWhite(){
        return doStuff(arguments, config.currentUserInChildGroup == false ? {} : {errorType: 'no_auth'}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {
                isTest: isTest,
                goformId: "REMOVE_WHITE_SITE",
                ids: params.ids.join(',')
            };
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == 'success') {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

	/**
     * 添加至网站白名单列表中
     * @method saveSiteWhite
	 * @param {Object} params JSON参数对象
     */
    function saveSiteWhite(){
        return doStuff(arguments, config.currentUserInChildGroup == false ? {} : {errorType: 'no_auth'}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {
                isTest: isTest,
                goformId: "ADD_WHITE_SITE",
                name: params.name,
                site: params.site
            };
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == 'success') {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

	/**
     * 获取家长控制时间限制信息
     * @method getTimeLimited
	 * @return {Object} JSON数组
	 * @example '0': ['0','8','20'], '1': [], '2': [], '3': [], '4': [], '5': [], '6': []
     */
    function getTimeLimited(){
        var defaultResult = {
            '0': [], '1': [], '2': [], '3': [], '4': [], '5': [], '6': []
        };

        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {
                isTest: isTest,
                cmd: "time_limited"
            };
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return parseTimeLimited(data);
            } else {
                return defaultResult;
            }
        }

        //0+0,8,20;1+9,13;2+10,15,18,22
        function parseTimeLimited(data) {
            if (data.time_limited == '') {
                return {time_limited: []};
            }
            var weeks = data.time_limited.split(';');
            _.each(weeks, function (week) {
                var weekTime = week.split('+');
                if (weekTime.length == 2) {
                    defaultResult[weekTime[0]] = weekTime[1].split(',');
                }
            });
            return defaultResult;
        }
    }

	/**
     * 设置时间限制信息
     * @method saveTimeLimited
	 * @param {Object} JSON数组，时间信息
	 * @example {time:"0+0,8,20;1+9,13;2+10,15,18,22"}
     */
    function saveTimeLimited(){
        return doStuff(arguments, config.currentUserInChildGroup == false ? {} : {errorType: 'no_auth'}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {
                isTest: isTest,
                goformId: "SAVE_TIME_LIMITED",
                time_limited: params.time
            };
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == 'success') {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

	/**
     * 获取wifi定时休眠唤醒信息
     * @method getTsw
	 * @return {Object} JSON数组
	 * @example {
		 closeEnable:"0"
         closeH:"22"
         closeM:"00"
         closeTime:"22:00"
         openEnable:"1"
         openH:"06"
         openM:"30"
         openTime:"06:30"
	    }
     */
    function getTsw(){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {
                isTest: isTest,
                cmd: "openEnable,closeEnable,openTime,closeTime",
                multi_data: '1'
            };
            return requestParams;
        }

        function deal(data) {
            if (data) {
                if(data.openTime.indexOf(':') != -1){
                    var open = data.openTime.split(':');
                    data.openH = leftInsert(open[0], 2, '0');
                    data.openM = leftInsert(open[1], 2, '0');
                } else {
                    data.openH = '06';
                    data.openM = '00';
                }
                if(data.closeTime.indexOf(':') != -1){
                    var close = data.closeTime.split(':');
                    data.closeH = leftInsert(close[0], 2, '0');
                    data.closeM = leftInsert(close[1], 2, '0');
                } else {
                    data.closeH = '22';
                    data.closeM = '00';
                }
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

	/**
     * 设置wifi定时休眠唤醒信息
     * @method saveTsw
	 * @param {Object} JSON数组
     */
    function saveTsw(){
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {
                isTest: isTest,
                goformId: "SAVE_TSW",
				openEnable: params.openEnable,
				closeEnable: params.closeEnable
            };

		  	if(params.openEnable == '1') {
				requestParams.openTime = params.openTime;
				requestParams.closeTime = params.closeTime;
			}

            return requestParams;
        }

        function deal(data) {
            if (data && data.result == 'success') {
                return data;
            } else if(data && data.result == 'failure'){
                return data;
            }else {
                return unknownErrorObject;
            }
        }
    }

	/**
     * 手动校准流量信息
     * @method trafficCalibration
	 * @param {Object} JSON
     */
    function trafficCalibration(){
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {
                isTest: isTest,
                goformId: "FLOW_CALIBRATION_MANUAL",
                calibration_way: params.way,
                time: params.way == 'time' ? params.value : 0,
                data: params.way == 'data' ? params.value : 0
            };
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == 'success') {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    function getParams() {
            return doStuff(arguments, {}, prepare, deal, null, false);

            function prepare(params, isPost) {
                var requestParams = {};
                requestParams.isTest = isTest;
                if (_.isArray(params.nv)) {
                    requestParams.cmd = params.nv.join(',');
                    requestParams.multi_data = 1;
                } else {
                    requestParams.cmd = params.nv;
                }
                return requestParams;
            }

            function deal(data) {
                if (data) {
                    return data;
                } else {
                    return unknownErrorObject;
                }
            }
    }

	/**
     * 获取跳转信息
     * @method getRedirectData
     */
    function getRedirectData() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "vwim_mc_state,traffic_overrun,detect_new_version";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {};
                result.vwim_mc_state = data.vwim_mc_state;
                result.traffic_overrun = data.traffic_overrun;
                result.detect_new_version = data.detect_new_version;
                result.blc_wan_mode = timerInfo.blc_wan_mode;
                return result;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 清除跳转flag
     * @method clearRedirectFlag
     */
    function clearRedirectFlag() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "CLEAR_REDIRECT_FLAG";
            requestParams.flag_id = params.redirectFlags;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    function getV4Switch(){
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "lock_zone_enable,pin_interlock_and_V4_lock";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
	}

    function setV4Switch(){
		return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "PIN_LOCK_V4_ENCODE";
            requestParams.pin_interlock_and_V4_lock = params.pin_interlock_and_V4_lock;
			requestParams.TspLock_key_data = params.TspLock_key_data;
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
	}

    function getCellId(){
		return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "cell_id_list,global_cell_id,network_type,sub_network_type,cell_not_correct";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
	}

    function setCellIdSwitch(){
		return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "LOCK_ZONE";
            requestParams.lock_zone_enable = params.lock_zone_enable;
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
	}

    /**
     * 获取当前DDNS信息
     * @method setUartBaudrate
	 * @return {Object} JSON
     */
    function getDdnsParams(params, callback){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data:1,
                cmd:"DDNS_Enable,DDNS_Mode,DDNSProvider,DDNSAccount,DDNSPassword,DDNS,DDNS_Hash_Value"
            };
        }
        function deal(data) {
            if (data) {
                return {
                    DDNS_Enable: data.DDNS_Enable,
                    DDNS_Mode: data.DDNS_Mode,
                    DDNSProvider: data.DDNSProvider,
                    DDNSAccount: data.DDNSAccount,
                    DDNSPassword: data.DDNSPassword,
                    DDNS: data.DDNS,
                    DDNS_Hash_Value: data.DDNS_Hash_Value
                }
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取当前TTL信息
     * @param params
     * @param callback
     * @returns {undefined}
     */
     function getTTLParams(params, callback) {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest: isTest,
                multi_data: 1,
                cmd: "ttl_enable,ipv4_ttl_value,ttl_display"
            };
        }
        function deal(data) {
            if (data) {
                return {
                    ttl_enable: data.ttl_display,
                    ipv4_ttl_value: data.ipv4_ttl_value
                }
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取当前IMEI信息
     * @param params
     * @param callback
     * @returns {undefined}
     */
     function getIMEIParams(params, callback) {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest: isTest,
                multi_data: 1,
                cmd: "imei_enable,imei"
            };
        }
        function deal(data) {
            if (data) {
                return {
                    imei_enable: data.imei_enable,
                    imei: data.imei
                }
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取EsimSim登录状态
     * @method login_EsimSim
     * @param {Object} JSON
     * @example
     * //返回结果格式
     *{
     *   password:"123456"
     *}
     * @return {Object} JSON
     */
     function login_EsimSim() {
        return doStuff(arguments, {}, prepare, deal, { errorType: 'badPassword' }, true);

        function prepare(params, isPost) {
            var obj = {
                isTest: isTest,
                goformId: "ESIM_LOGIN",
                password: config.PASSWORD_ENCODE ? Base64.encode(params.password) : params.password,
            };
            return obj;
        }

        function deal(data) {
            //in doc, notes:If the user is 'already logged in' at the device, it calls back as success.
            if (data && (data.result == "0" || data.result == "4")) {
                return { result: true };
            } else {
                var loginError = {};
                switch (data.result) {
                    case "1":
                        loginError = { errorType: "Login Fail" };
                        break;
                    case "2":
                        loginError = { errorType: "duplicateUser" };
                        break;
                    case "3":
                        loginError = { errorType: "badPassword" };
                        break;
                    case "5":
                        loginError = { errorType: "badUsername" };
                        break;
                    default:
                        loginError = { errorType: "Login Fail" };
                        break;
                }
                return $.extend(unknownErrorObject, loginError);
            }
        }
    }

    /**
     * 获取当前ESIM/SIM信息
     * @param params
     * @param callback
     * @returns {undefined}
     */
     function getEsimSimParams(params, callback) {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest: isTest,
                multi_data: 1,
                cmd: "user_web_disp_sim_esim_config,user_web_disp_sim_support,esim_num,esim_login_psw_mode"
            };
        }
        function deal(data) {
            if (data) {
                return {
                    EsimSim_enable: data.user_web_disp_sim_esim_config,
                    Esim_num: data.esim_num,
                    user_web_disp_sim_support: data.user_web_disp_sim_support,
                    Esim_login_psw_mode: data.esim_login_psw_mode
                }
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     *获取EsimSim信息
     * @method getEsimSimSetting
     */
     function getEsimSimSetting() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.cmd = "sim_esim_mode";
            requestParams.multi_data = 1;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                var result = {};
                result.EsimSimSetting = data.sim_esim_mode;
                return result;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     *设置EsimSim信息
     * @method setEsimSimSetting
     */
    function setEsimSimSetting() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.goformId = "set_esim";
            requestParams.isTest = isTest;
            requestParams.esimmode = params.EsimSimSetting;
            return requestParams;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 设置DDNS
     * @method DDNS
	 * @param {Object} JSON
     */
    function setDDNSForward() {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
            var requestParams = $.extend({
                isTest:isTest

            }, params);
            return requestParams;
        }
        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 设置TTL
     * @method TTL
	 * @param {Object} JSON
     */
    function setTTL() {
        return doStuff(arguments, {}, prepare, deal, null, true);
        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "set_ip_ttl";
            requestParams.ipv4_ttl_value = params.ipv4_ttl_value;
            return requestParams;
        }
        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 设置IMEI
     * @method IMEI
	 * @param {Object} JSON
     */
     function setIMEI() {
        return doStuff(arguments, {}, prepare, deal, null, true);
        function prepare(params, isPost) {
            var requestParams = {};
            requestParams.isTest = isTest;
            requestParams.goformId = "set_imei";
            requestParams.imei_value = params.imei_value;
            return requestParams;
        }
        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取当前升级模式
     * @method DDNS
	 * @return {Object} JSON  "mifi_fota"表示fota升级 "mifi_local"表示本地升级
     */
	function getUpdateType (){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {
                isTest: isTest,
                cmd: "update_type"
            };
            return requestParams;
        }

        function deal(data) {
			return {
				update_type : data.update_type ? data.update_type : "mifi_fota"
			}
        }
    }

	function getCurretnMAC(){
		return getUserMacAddr({}).get_user_mac_addr;
	}

//自测NV get 使用
	function getNvValue (){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            params.isTest = isTest;
            return params;
        }

        function deal(data) {
			return data;
        }
    }
//自测goform set 使用
	function setGoform (){
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params, isPost) {
	        params.isTest = isTest;
            return params;
        }

        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }


	function getLoginMode (){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {
                isTest: isTest,
                cmd: "login_mode"
            };
            return requestParams;
        }

        function deal(data) {
			return {
				login_mode : data.login_mode
			}
        }
    }

	function getTelnetAdb (){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            var requestParams = {
                isTest: isTest,
                cmd: "telnetd_enable,debug_enable",
                // cmd: "telnetd_enable,adbd_enable,twtool_enable,tw_log_mode",
            	multi_data:1,
            };
            return requestParams;
        }

        function deal(data) {
			return {
				telnetMode : data.telnetd_enable,
				adbMode : data.debug_enable
			}
        }
    }


    function setTelnetadbSetting() {
    	return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.isTest = isTest;
			requestParams.goformId = "tw_telnet_config";
			requestParams.telnetd_enable = params.telnet;
			requestParams.debug_enable = params.adb;
			return requestParams;
		}

		function deal(data) {
			if (data) {
				return data;
			} else {
				return unknownErrorObject;
			}
		}
    }

    // function setTelnetadbSetting() {
    // 	return doStuff(arguments, {}, prepare, deal, null, true);
	//
	// 	function prepare(params, isPost) {
	// 		var requestParams = {};
	// 		requestParams.isTest = isTest;
	// 		requestParams.goformId = "SET_TELNETD_ADBD_CONFIG";
	// 		requestParams.telnetd_enable = params.telnetMode;
	// 		requestParams.adbd_enable = params.adbMode;
	// 		requestParams.twtool_enable = params.twtoolmode;
	// 		requestParams.tw_log_mode = params.twlogmode;
	// 		return requestParams;
	// 	}
	//
	// 	function deal(data) {
	// 		if (data) {
	// 			return data;
	// 		} else {
	// 			return unknownErrorObject;
	// 		}
	// 	}
    // }


    /**
     * è·åå½åPINGåæä½æ¥å¿
     * @method getPingLog
	 * @return {Object} JSON
     */
    function getPingLog(params, callback){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data:1,
                cmd:"ping_log_show,pingstatue"
            };
        }
        function deal(data) {
            if (data) {
                return {
					ping_log_show:data.ping_log_show,
					pingstatue:data.pingstatue,
                }
            } else {
                return unknownErrorObject;
            }
        }
    }
    /**
     * å¼å§PINGåæä½
     * @method StartPing
	 * @return {Object} JSON
     */
    function StartPing() {
    	return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.goformId = "PINT_DIAGNOSTICS_START";
			requestParams.isTest = isTest;
			requestParams.ping_diag_addr  = params.ping_ip_addr;
			requestParams.ping_count = params.ping_count;
			requestParams.debug_mode = "PING";

			return requestParams;
		}

		function deal(data) {
			if (data) {
				return data;
			} else {
                callback(data);
			}
		}
    }
    /**
     * ç»æPINGåæä½
     * @method StopPing
	 * @return {Object} JSON
     */
    function StopPing() {
    	return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.goformId = "PINT_DIAGNOSTICS_STOP";
			requestParams.isTest = isTest;
			requestParams.debug_mode = "PING";

			return requestParams;
		}

		function deal(data) {
			if (data) {
				return data;
			} else {
                callback(data);
			}
		}
    }
    /**
     * è·åå½åTRACEåæä½æ¥å¿
     * @method getPingLog
	 * @return {Object} JSON
     */
    function getTraceLog(params, callback){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data:1,
                cmd:"trace_log_show,tracestatue"
            };
        }
        function deal(data) {
            if (data) {
                return {
					trace_log_show:data.trace_log_show,
					tracestatue:data.tracestatue,
                }
            } else {
                return unknownErrorObject;
            }
        }
    }
    /**
     * å¼å§traceæä½
     * @method StartTrace
	 * @return {Object} JSON
     */
    function StartTrace() {
    	return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.goformId = "TRACE_DIAGNOSTICS_START";
			requestParams.isTest = isTest;
			requestParams.trace_ip_url = params.trace_ip_url;
			requestParams.debug_mode = "TRACEROUTE";

			return requestParams;
		}

		function deal(data) {
			if (data) {
				return data;
			} else {
                callback(data);
			}
		}
    }

    /**
     * ç»æTRACEæä½
     * @method StopTrace
	 * @return {Object} JSON
     */
    function StopTrace() {
    	return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.goformId = "TRACE_DIAGNOSTICS_STOP";
			requestParams.isTest = isTest;
			requestParams.debug_mode = "TRACEROUTE";
			return requestParams;
		}

		function deal(data) {
			if (data) {
				return data;
			} else {
                callback(data);
			}
		}
    }


    function getlockbandinfo (params, callback){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data:1,
                cmd:"hide_net_3G_search_mode,LteBandLockSet,LteBandLockState,band_1,band_2,band_3,band_4,band_5,band_7,band_8,band_17,band_20,band_28,"+
                "band_34,band_38,band_39,band_40,band_41,"+
                "amt_band_1,amt_band_2,amt_band_3,amt_band_4,amt_band_5,amt_band_7,amt_band_8,amt_band_17,amt_band_20,"+
                "amt_band_28,amt_band_34,amt_band_38,amt_band_39,amt_band_40,amt_band_41,cpin"
            };
        }
        function deal(data) {
            if (data) {
                return {
					hide_net_3G_search_mode:data.hide_net_3G_search_mode,
					band1:data.band_1,
					LteBandLockState:data.LteBandLockState,
					LteBandLockSet:data.LteBandLockSet,
					band1:data.band_1,
					band2:data.band_2,
					band3:data.band_3,
					band4:data.band_4,
					band5:data.band_5,
					band7:data.band_7,
					band8:data.band_8,
					band17:data.band_17,
					band20:data.band_20,
					band28:data.band_28,
					band34:data.band_34,
					band38:data.band_38,
					band39:data.band_39,
					band40:data.band_40,
					band41:data.band_41,
					amt_band1:data.amt_band_1,
					amt_band2:data.amt_band_2,
					amt_band3:data.amt_band_3,
					amt_band4:data.amt_band_4,
					amt_band5:data.amt_band_5,
					amt_band7:data.amt_band_7,
					amt_band8:data.amt_band_8,
					amt_band17:data.amt_band_17,
					amt_band20:data.amt_band_20,
					amt_band28:data.amt_band_28,
					amt_band34:data.amt_band_34,
					amt_band38:data.amt_band_38,
					amt_band39:data.amt_band_39,
					amt_band40:data.amt_band_40,
					amt_band41:data.amt_band_41,
                }
            } else {
                return unknownErrorObject;
            }
        }
    }

    function setlockbandcfg() {
    	return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.goformId = "SET_LOCK_LTE_BAND_MODE";
			requestParams.isTest = isTest;
			requestParams.band1 = params.band1;
			requestParams.band2 = params.band2;
            		requestParams.band3 = params.band3;
			requestParams.band4 = params.band4;
			requestParams.band5 = params.band5;
           		 requestParams.band7 = params.band7;
			requestParams.band8 = params.band8;
			requestParams.band17 = params.band17;
      			requestParams.band20 = params.band20;
           		 requestParams.band28 = params.band28;
			requestParams.band34 = params.band34;
			requestParams.band38 = params.band38;
           		 requestParams.band39 = params.band39;
			requestParams.band40 = params.band40;
        			requestParams.band41 = params.band41;
			return requestParams;
		}

		function deal(data) {
			if (data) {
				return data;
			} else {
                callback(data);
			}
		}
    }

    function getlockcellinfo (params, callback){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data:1,
                cmd:"nv_arfcn,nv_pci,CellLockSet,CellLockState,actionlte,uarfcnlte,cellParaIdlte,sub_network_type,network_type,cpin",
          };
        }
        function deal(data) {
            if (data) {
                return {
					nv_arfcn:data.nv_arfcn,
					nv_pci:data.nv_pci,
					CellLockSet:data.CellLockSet,
					CellLockState:data.CellLockState,
					actionlte:data.actionlte,
					uarfcnlte:data.uarfcnlte,
					cellParaIdlte:data.cellParaIdlte,
                }
            } else {
                return unknownErrorObject;
            }
        }
    }

    function setlockcellcfg() {
    	return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.goformId = "SET_LOCK_LTE_CELL_MODE";
			requestParams.isTest = isTest;
			requestParams.actionlte = params.actionlte;
			requestParams.uarfcnlte = params.uarfcnlte;
			requestParams.cellParaIdlte = params.cellParaIdlte;
			return requestParams;
		}

		function deal(data) {
			if (data) {
				return data;
			} else {
                callback(data);
			}
		}
	}

   /**
     * »ñÈ¡TR069ÐÅÏ¢
     * @method getTR069Config
     * @return {Object} params json²ÎÊý¶ÔÏó
     */
    function getTR069Config() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data: "1",
                cmd:"tr069_cloudkey,tr069_nickvalue,tr069_ServerURL,tr069_CPEPortNo,tr069_ServerUsername,tr069_ServerPassword,tr069_ConnectionRequestURL,tr069_ConnectionRequestUname,tr069_ConnectionRequestPassword,wan_ipaddr,tr069_PeriodicInformEnable,tr069_PeriodicInformInterval,tr069_CertEnable,tr069_PeriodicInformTime"
            };
        }

        function deal(data) {
            if (data) {
                return {
                serverUrl : data.tr069_ServerURL,
                tr069_CPEPortNo : data.tr069_CPEPortNo,
                serverUserName : data.tr069_ServerUsername,
                serverPassword: data.tr069_ServerPassword,
                requestUrl: data.tr069_ConnectionRequestURL,
                requestUserName: data.tr069_ConnectionRequestUname,
                requestPassword: data.tr069_ConnectionRequestPassword,
                wanIpAddress: data.wan_ipaddr,
                tr069_PeriodicInformEnable: data.tr069_PeriodicInformEnable,
                tr069_PeriodicInformInterval: data.tr069_PeriodicInformInterval,
                tr069_CertEnable: data.tr069_CertEnable,
                tr069_PeriodicInformTime: data.tr069_PeriodicInformTime,
				cloudkey: data.tr069_cloudkey,
				nickname: data.tr069_nickvalue,
                };
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * »ñÈ¡TR069ÐÅÏ¢
     * @method getTR069Configuration
     * @return {Object} params json²ÎÊý¶ÔÏó
     * @author hewq
     * @date 2017-07-07
     */
    function getTR069Configuration() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data: "1",
                cmd:"tr069_cloudkey,tr069_nickvalue,tr069_use_test_config,tr069_app_enable,tr069_ServerURL,tr069_PeriodicInformEnable,tr069_PeriodicInformInterval,tr069_ACS_auth,tr069_ServerUsername,tr069_ServerPassword,tr069_CPE_auth,tr069_ConnectionRequestUname,tr069_ConnectionRequestPassword,tr069_ServerURL1,tr069_PeriodicInformEnable1,tr069_PeriodicInformInterval1,tr069_ACS_auth1,tr069_ServerUsername1,tr069_ServerPassword1,tr069_CPE_auth1,tr069_ConnectionRequestUname1,tr069_ConnectionRequestPassword1"
            };
        }

        function deal(data) {
            if (data) {
                return {
                    configurationMode : data.tr069_use_test_config,
                    acsUrl1 : data.tr069_ServerURL1,
                    periodicInformInterval1 : data.tr069_PeriodicInformInterval1,
                    acsUsername1: data.tr069_ServerUsername1,
                    acsPassword1: data.tr069_ServerPassword1,
                    cpeUsername1: data.tr069_ConnectionRequestUname1,
                    cpePassword1: data.tr069_ConnectionRequestPassword1,
                    tr069Enable: data.tr069_app_enable,
                    acsAuth1: data.tr069_ACS_auth1,
                    cpeAuth1: data.tr069_CPE_auth1,
                    periodicInform1: data.tr069_PeriodicInformEnable1,
                    acsUrl : data.tr069_ServerURL,
                    periodicInformInterval : data.tr069_PeriodicInformInterval,
                    acsUsername: data.tr069_ServerUsername,
                    acsPassword: data.tr069_ServerPassword,
                    cpeUsername: data.tr069_ConnectionRequestUname,
                    cpePassword: data.tr069_ConnectionRequestPassword,
                    acsAuth: data.tr069_ACS_auth,
                    cpeAuth: data.tr069_CPE_auth,
                    periodicInform: data.tr069_PeriodicInformEnable,
                    cloudkey: data.tr069_cloudkey,
                    nickname: data.tr069_nickvalue,
                };
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * ÉèÖÃTR069
     * @method setTR069Configuration
     * @param {Object} params json²ÎÊý¶ÔÏó
     * @param {function} callback »ñÈ¡µ½½á¹ûºóµÄ»Øµ÷º¯Êý
     */
    function setTR069Configuration(params, callback) {
        return doStuff(arguments, {}, prepare, deal, null, true);

        function prepare(params) {
            var requestParams = $.extend({
                isTest:isTest
            }, params);
            return requestParams;
        }

        function deal(data) {
            if (data && data.result == "success") {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取当前系统运行状态信息
     * @method getSystermStatue
	 * @return {Object} JSON
     */
    function getSystermStatue(params, callback){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data:1,
                cmd:"blc_wan_mode,"+
					"wan1_ip,wan1_gw,wan1_ipv6_interface_id,wan1_ipv6_gw,pdp_type, pdp_act_type1,"+
					"wan1_pridns,wan1_secdns,wan1_ipv6_pridns_auto,wan1_ipv6_pridns_auto,wan_netmask,"+
					"lan_ipaddr,ipv6_lan_ipaddr,lan_netmask,gmac_addr,dhcpEnabled,ppp_status,ethwan_mode,lanconnectstatue",
            };
        }
        function deal(data) {
            if (data) {
                return {
					blc_wan_mode: data.blc_wan_mode,

					wan_ipaddr: data.wan1_ip,
					wan_gateway: data.wan1_gw,
					wandnsserver: data.wan1_pridns,
					wansecdnsserver: data.wan1_secdns,
					ipv6_wan_ip:data.wan1_ipv6_interface_id,
                    ipv6_wan_gateway:data.wan1_ipv6_gw,
					ipv6_wan_ipaddr: data.wan1_ipv6_pridns_auto,
					ipv6_wandnsserver:data.wan1_ipv6_pridns_auto,

					pdp_type: data.pdp_type,
					pdp_real_type: data.pdp_act_type1,

					wannetmask: data.wan_netmask,
					lanipaddr: data.lan_ipaddr,
					ipv6_lanipaddr: data.ipv6_lan_ipaddr,
					lanmacaddr: data.gmac_addr,
					lannetmask: data.lan_netmask,
					landhcpstatue: data.dhcpEnabled,
					lanconnectstatue: data.lanconnectstatue,
					ethwan_mode:data.ethwan_mode,
					ppp_status:data.ppp_status,
                }
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 获取当前系统运行状态信息
     * @method getDeviceRuninfo
	 * @return {Object} JSON
     */
    function getDeviceRuninfo(params, callback){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data:1,
                cmd:"cr_version,hardware_version,run_time,pd_version,imei,sim_imsi,ziccid,gmac_addr",
            };
        }
        function deal(data) {
            if (data) {
                return {
					sw_version: data.cr_version,
					hw_version: data.hardware_version,
					run_time: data.run_time,
					pd_version: data.pd_version,
					imei: data.imei,
					sim_imsi: data.sim_imsi,
					ziccid: data.ziccid,
					lanmacaddr:data.gmac_addr,
                }
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * è·åå½åç½ç»ç¶æä¿¡æ¯
     * @method getNetworkStatue
	 * @return {Object} JSON
     */
    function getNetworkStatue(params, callback){
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data:1,
                cmd:"network_provider,cpin,network_type,sub_network_type,ModemStatue,ppp_status,nv_band,nv_bandwidth,nv_arfcn,nv_globecellid,nv_enodbid,nv_cellid,nv_pci,nv_rsrp,nv_rsrq,"+
				"nv_sinr,nv_rsrq,creg_stat,cereg_stat,nv_sinr,user_web_disp_rssi_3g_4g"
            };
        }
        function deal(data) {
            if (data) {
                return {
					network_provider:data.network_provider,
                    			cpin:data.cpin,
					network_type:data.network_type,
					sub_network_type:data.sub_network_type,
					ModemStatue:data.ModemStatue,
					ppp_status:data.ppp_status,
					nv_band:data.nv_band,
					CurrentBandwidth:data.nv_bandwidth,
					nv_arfcn:data.nv_arfcn,
					nv_globecellid:data.nv_globecellid,
					nv_enodebid:data.nv_enodbid,
					nv_cellid:data.nv_cellid,
					nv_pci:data.nv_pci,
					nv_rsrp:data.nv_rsrp,
					nv_rsrq:data.nv_rsrq,
					nv_sinr:data.nv_sinr,
					// nv_rsrq:data.nv_rsrq,
					creg_stat:data.creg_stat,
					cereg_stat:data.cereg_stat,
					user_web_disp_rssi_3g_4g:data.user_web_disp_rssi_3g_4g,
                }
            } else {
                return unknownErrorObject;
            }
        }
    }

    	   /**
     * 数据更新
     * @method getL2TPInfo
     * @param {Object} JSON 参数对象
     */
    function getL2TPInfo() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data:1,
                cmd:"l2tp_enable,lns_address,tunnel,tunnel_pw",
            };
        }

        function deal(data) {
            if (data) {
                return {
					l2tp_enable:data.l2tp_enable,
					lns_address:data.lns_address,
					tunnel:data.tunnel,
					tunnel_pw:data.tunnel_pw,

                }
            } else {
                return unknownErrorObject;
            }
        }
    }

	function getPPTPInfo() {
        return doStuff(arguments, {}, prepare, deal, null, false);

        function prepare(params, isPost) {
            return {
                isTest:isTest,
                multi_data:1,
                cmd:"pptp_enable,pptp_server,pptp_user,pptp_passwd",
            };
        }

        function deal(data) {
            if (data) {
                return {
					pptp_enable:data.pptp_enable,
					pptp_address:data.pptp_server,
					pptp_usr:data.pptp_user,
					pptp_pw:data.pptp_passwd,

                }
            } else {
                return unknownErrorObject;
            }
        }
    }

	   /**
     * 数据更新
     * @method SetL2tpsave
     * @param {Object} JSON 参数对象
     */
    function SetL2tpsave() {
        return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.goformId = "set_xl2tp_config";
			requestParams.isTest = isTest;
			requestParams.lns_address = params.lns_address;
			requestParams.tunnel = params.tunnel;
			requestParams.tunnel_pw = params.tunnel_pw;
			requestParams.l2tp_enable = params.l2tp_enable;

			return requestParams;
		}
        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

	function Setpptpsave() {
        return doStuff(arguments, {}, prepare, deal, null, true);

		function prepare(params, isPost) {
			var requestParams = {};
			requestParams.goformId = "set_pptp_config";
			requestParams.isTest = isTest;
			requestParams.pptp_server = params.pptp_server;
			requestParams.pptp_usr = params.pptp_usr;
			requestParams.pptp_pw = params.pptp_pw;
			requestParams.pptp_enable = params.pptp_enable;

			return requestParams;
		}
        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
     * 决定是否显示TR069
     */
    function showTr069(){
        return doStuff(arguments, {}, prepare, deal, null, false);
        function prepare(params, isPost){
            var params = {
                isTest: isTest,
                cmd: 'tr069_need_display',
                multi_data: 1
            }
            return params;
        }
        function deal(data){
            if(data){
                return data;
            }else{
                return unknownErrorObject;
            }
        }
    }

    /**
     * 决定是否显示VPNtab
     */
    function showVPN(){
        return doStuff(arguments, {}, prepare, deal, null, false);
        function prepare(params, isPost) {
            var params = {
                isTest: isTest,
                cmd: 'vpn_need_display,use_vpn_state',
                multi_data: 1
            }
            return params;
        }
        function deal(data) {
            if (data) {
                return data;
            } else {
                return unknownErrorObject;
            }
        }
    }

    /**
 * VPN l2tp页面请求事件
 * @method getVPNInfo
 */
    function getVPNInfo() {
        return doStuff(arguments, {}, prepare, deal, null, false);
        function prepare() {
            var requireParams = {
                isTest: false,
                cmd: 'l2tp_status,l2tp_enable,l2tp_server,l2tp_name,l2tp_tunnel_pswd,l2tp_interval,l2tp_user,l2tp_passwd',
                multi_data: 1
            }
            return requireParams;
        }
        function deal(data) {
            return data ? data : unknownErrorObject;
        }
    }
    /**
 * VPN pptp页面请求事件
 * @method getVPNInfoPptp
 */
    function getVPNInfoPptp() {
        return doStuff(arguments, {}, prepare, deal, null, false);
        function prepare() {
            var requireParams = {
                isTest: false,
                cmd: 'pptp_status,pptp_enable,pptp_server,pptp_name,pptp_tunnel_pswd,pptp_interval,pptp_user,pptp_passwd,pptp_auth_type',
                multi_data: 1
            }
            return requireParams;
        }
        function deal(data) {
            return data ? data : unknownErrorObject;
        }
    }
    /**
     * VPN页面点击应用按钮触发事件
     * @method setVPNInfo
     */
    function setVPNInfo(params) {
        return doStuff(arguments, {}, prepare, deal, null, true)
        function prepare() {
            var postparams = {
                isTest: false
            }
            $.extend(postparams, params);
            return postparams;
        }
        function deal(data) {
            return data;
        }
    }
        /**
         * VPN pptp页面请求事件
         * @method wifi6_wpa3_ax
         */
        function wifi6_wpa3_ax() {
            return doStuff(arguments, {}, prepare, deal, null, false);
            function prepare() {
                var requireParams = {
                    isTest: false,
                    cmd: 'display_wpa3,mf86_display_ax,display_ax',
                    multi_data: 1
                }
                return requireParams;
            }
            function deal(data) {
                return data ? data : unknownErrorObject;
            }
        }
	return {
		wifi6_wpa3_ax : wifi6_wpa3_ax,
		clearRedirectFlag : clearRedirectFlag,
		getRedirectData : getRedirectData,
		getWifiBasic : getWifiBasic,
		setWifiBasic : setWifiBasic,
		setWifiBasic4SSID2:setWifiBasic4SSID2,
		setWifiBasicMultiSSIDSwitch:setWifiBasicMultiSSIDSwitch,
		getSecurityInfo : getSecurityInfo,
		setSecurityInfo : setSecurityInfo,
		git_admin_encrypsw : git_admin_encrypsw,
		getCurrentlyAttachedDevicesInfo : getCurrentlyAttachedDevicesInfo,
		getAttachedCableDevices: getAttachedCableDevices,
		getLanguage : getLanguage,
		setLanguage : setLanguage,
		getNetSelectInfo : getNetSelectInfo,
		setBearerPreference : setBearerPreference,
		scanForNetwork : scanForNetwork,
		getConnectionInfo : getConnectionInfo,
		getStatusInfo : getStatusInfo,
		connect : connect,
		disconnect : disconnect,
		setNetwork : setNetwork,
		savePhoneBook : savePhoneBook,
		deletePhoneBooks :deletePhoneBooks,
		deleteAllPhoneBooks:deleteAllPhoneBooks,
		deleteAllPhoneBooksByGroup:deleteAllPhoneBooksByGroup,
		getDevicePhoneBooks : getDevicePhoneBooks,
		getSIMPhoneBooks : getSIMPhoneBooks,
		getPhoneBooks : getPhoneBooks,
		getPhoneBookReady: getPhoneBookReady,
		getPhoneBooksByGroup: getPhoneBooksByGroup,
		getConnectionMode: getConnectionMode,
		getDisplay: getDisplay,
		setConnectionMode: setConnectionMode,
		getApnSettings : getApnSettings,
		deleteApn : deleteApn,
		setDefaultApn : setDefaultApn,
		addOrEditApn : addOrEditApn,
		getSIMPhoneBookCapacity : getSIMPhoneBookCapacity,
		getDevicePhoneBookCapacity : getDevicePhoneBookCapacity,
		getLoginData:getLoginData,
		login:login,
		logout:logout,
		getLoginStatus:getLoginStatus,
		enterPIN:enterPIN,
		enterPUK:enterPUK,
		getSMSReady:getSMSReady,
		getSMSMessages : getSMSMessages,
		sendSMS : sendSMS,
		saveSMS : saveSMS,
		deleteAllMessages : deleteAllMessages,
		deleteMessage : deleteMessage,
		setSmsRead : setSmsRead,
		resetNewSmsReceivedVar : resetNewSmsReceivedVar,
		resetSmsReportReceivedVar : resetSmsReportReceivedVar,
		getSMSDeliveryReport : getSMSDeliveryReport,
		getSmsCapability : getSmsCapability,
		changePassword : changePassword,
		getPinData : getPinData,
		enablePin : enablePin,
		disablePin : disablePin,
		changePin : changePin,
		getLanInfo: getLanInfo,
		setLanInfo: setLanInfo,
		getSmsSetting: getSmsSetting,
		setSmsSetting: setSmsSetting,
		restoreFactorySettings : restoreFactorySettings,
		checkRestoreStatus : checkRestoreStatus,
		getWpsInfo: getWpsInfo,
		openWps: openWps,
		getSleepMode: getSleepMode,
		setSleepMode: setSleepMode,
		getSysSecurity: getSysSecurity,
		setSysSecurity: setSysSecurity,
		getPortForward: getPortForward,
		setPortForward: setPortForward,
		deleteForwardRules: deleteForwardRules,
		enableVirtualServer: enableVirtualServer,
		getSDConfiguration: getSDConfiguration,
		setSdCardMode: setSdCardMode,
		checkFileExists: checkFileExists,
		getFileList: getFileList,
		fileRename: fileRename,
		getSdMemorySizes : getSdMemorySizes,
		deleteFilesAndFolders : deleteFilesAndFolders,
		createFolder : createFolder,
		setSdCardSharing:setSdCardSharing,
		getQuickSettingInfo:getQuickSettingInfo,
		setQuickSetting4IPv6:setQuickSetting4IPv6,
		getPortFilter: getPortFilter,
		setPortFilterBasic: setPortFilterBasic,
		setPortFilter: setPortFilter,
		deleteFilterRules: deleteFilterRules,
		getWifiAdvance: getWifiAdvance,
		setWifiAdvance: setWifiAdvance,
		getWifiRange: getWifiRange,
		setWifiRange: setWifiRange,
		getUpnpSetting: getUpnpSetting,
		setUpnpSetting: setUpnpSetting,
		getDmzSetting: getDmzSetting,
		setDmzSetting: setDmzSetting,
		getDeviceInfo: getDeviceInfo,
		getPortMap: getPortMap,
		setPortMap: setPortMap,
		enablePortMap: enablePortMap,
		deleteMapRules: deleteMapRules,
		getTrafficAlertInfo : getTrafficAlertInfo,
		setTrafficAlertInfo : setTrafficAlertInfo,
		getUSSDResponse : getUSSDResponse,
		USSDReplyCancel : USSDReplyCancel,
		getNetworkUnlockTimes:getNetworkUnlockTimes,
		unlockNetwork : unlockNetwork,
		setUpdateInfoWarning : setUpdateInfoWarning,
		getUpdateInfoWarning : getUpdateInfoWarning,
		getAPStationBasic:getAPStationBasic,
		setAPStationBasic:setAPStationBasic,
		getHotspotList:getHotspotList,
		searchHotspot:searchHotspot,
		getSearchHotspotList:getSearchHotspotList,
		saveHotspot:saveHotspot,
		deleteHotspot:deleteHotspot,
		connectHotspot:connectHotspot,
		disconnectHotspot:disconnectHotspot,
		getOpMode:getOpMode,
		getRj45PlugState:getRj45PlugState,
		SetOperationMode:SetOperationMode,
		getPppoeParams:getPppoeParams,
		setPppoeDialMode:setPppoeDialMode,
		getSntpParams:getSntpParams,
		setSntpSetting:setSntpSetting,
		setTimeToPC:setTimeToPC,
		setSNTPDate:setSNTPDate,
		addUrlFilterRule:addUrlFilterRule,
		getUrlFilterList:getUrlFilterList,
		deleteSelectedRules:deleteSelectedRules,
		getWdsInfo:getWdsInfo,
		setWDS:setWDS,
		getSyslogInfo:getSyslogInfo,
		setSysLog:setSysLog,
		getVoipSettings:getVoipSettings,
		setVoipSettings:setVoipSettings,
		getVoipUserDetails:getVoipUserDetails,
		getVoipUserRegisterStatus:getVoipUserRegisterStatus,
		setVoipUserDetails:setVoipUserDetails,
		setVoipAdvancedSettings:setVoipAdvancedSettings,
		getVoipAdvancedSettings:getVoipAdvancedSettings,
		getVoipSupplementaryService:getVoipSupplementaryService,
		setVoipSupplementaryService:setVoipSupplementaryService,
		getMacFilterInfo:getMacFilterInfo,
		setMacFilter:setMacFilter,
		getFastbootSetting: getFastbootSetting,
		setFastbootSetting: setFastbootSetting,
		turnOffDevice:turnOffDevice,
		restart: restart,
		timerUpdaterEnable: timerUpdaterEnable,
		childGroupList: childGroupList,
		addChildGroup: addChildGroup,
		removeChildGroup: removeChildGroup,
		checkCurrentUserInChildGroup: checkCurrentUserInChildGroup,
		editHostName: editHostName,
		getSiteWhiteList: getSiteWhiteList,
		removeSiteWhite: removeSiteWhite,
		saveSiteWhite: saveSiteWhite,
		getTimeLimited: getTimeLimited,
		saveTimeLimited: saveTimeLimited,
		getHostNameList: getHostNameList,
		getTsw: getTsw,
		saveTsw: saveTsw,
		trafficCalibration: trafficCalibration,
		getParams: getParams,
		getNewVersionState:getNewVersionState,
		getUpgradeResult:getUpgradeResult,
		getCurrentUpgradeState:getCurrentUpgradeState,
		setUpgradeSelectOp:setUpgradeSelectOp,
		addTimerThings:addTimerThings,
		removeTimerThings:removeTimerThings,
		getPackSizeInfo:getPackSizeInfo,
		getMandatory:getMandatory,
		getOTAUpdateSetting:getOTAUpdateSetting,
		setOTAUpdateSetting:setOTAUpdateSetting,
		getSignalStrength: getSignalStrength,
		getOTAlastCheckTime: getOTAlastCheckTime,
		clearUpdateResult:clearUpdateResult,
		refreshAPStationStatus: refreshAPStationStatus,
		getV4Switch: getV4Switch,
		setV4Switch: setV4Switch,
		getCellId: getCellId,
		setCellIdSwitch: setCellIdSwitch,
		getDdnsParams: getDdnsParams,
		setDDNSForward: setDDNSForward,
		getUpdateType: getUpdateType,
		getCurretnMAC: getCurretnMAC,
        setGoform:setGoform,
        getNvValue:getNvValue,
        getLoginMode:getLoginMode,
        getTelnetAdb:getTelnetAdb,
        setTelnetadbSetting:setTelnetadbSetting,
		getNetworkStatue:getNetworkStatue,
		StartPing:StartPing,
		StopPing:StopPing,
		getPingLog: getPingLog,
		StartTrace:StartTrace,
		StopTrace:StopTrace,
		getTraceLog: getTraceLog,

		//add by cwp at 201080510 for lock BAND and lock PCI
		getlockbandinfo:getlockbandinfo,
		setlockbandcfg:setlockbandcfg,
		getlockcellinfo:getlockcellinfo,
		setlockcellcfg:setlockcellcfg,
        getTR069Config:getTR069Config,
        getTR069Configuration:getTR069Configuration,
        setTR069Configuration:setTR069Configuration,
		//device info and mobile network state
		getDeviceRuninfo:getDeviceRuninfo,
		getSystermStatue: getSystermStatue,
        getNetworkStatue: getNetworkStatue,
        getDTUParams: getDTUParams,
        setDTUParams: setDTUParams,
		SetL2tpsave: SetL2tpsave,
		getL2TPInfo: getL2TPInfo,
		Setpptpsave: Setpptpsave,
		getPPTPInfo: getPPTPInfo,
		needUsername: needUsername,
        dtuDisplay: dtuDisplay,
        showTr069: showTr069,
        showVPN: showVPN,
        getVPNInfo: getVPNInfo,
        getVPNInfoPptp: getVPNInfoPptp,
        setVPNInfo: setVPNInfo,
        getLogoCust: getLogoCust,

        custAdminPsw: custAdminPsw,
        custEnableWebuiMenu: custEnableWebuiMenu,
        
        getDetection: getDetection,
        setDetection: setDetection,
        //add TTL 20210909
        getTTLParams: getTTLParams,
        setTTL: setTTL,
        //add IMEI 20210909
        getIMEIParams: getIMEIParams,
        setIMEI: setIMEI,
        //add EsimSim 20211008
        login_EsimSim: login_EsimSim,
        getEsimSimParams: getEsimSimParams,
        getEsimSimSetting: getEsimSimSetting,
        setEsimSimSetting: setEsimSimSetting,
        mach_sim_lock_statusfunc: mach_sim_lock_statusfunc,
        set_MACH_SIM_LOCK: set_MACH_SIM_LOCK
	};
});
