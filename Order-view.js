/*
 ############################ Global Variables ########################
 */
var orderGroup = [];
var states = {};
var orderInfo = {};
var countriesArray = [];
var statesArray = {};
var areaCodesArray = {};
var sectionData = [];
var shippingMethods = [];
var hasVoipItems = {};
var addrJson = {};
addrJson.country = "US";
addrJson.postal = "";
addrJson.addr1 = "";
addrJson.addr2 = "";
addrJson.city = "";
addrJson.state_prov = "";
var orderGroupIndex = 0;
var one_time_tax_total = {};
var mrc_tax_total = {};
var one_time_total = {};
var shipping_cost = {};
var mrc_total = {};
var hasRepro = false;
var showSign = false;
var finishedShipping = false;
var reprovisioned = 0;
var reproPhonesCount = 0;
var stateLoaded = false;
var currentGroupIndex = 0;
var completedOrder = [];
var completedOrderGroups = [];
var selectedNumbers = [];

/*
 * Create status window dialog 
 **/
function createDialog(){
	
	$('#status-window').dialog({
		modal: true,
		autoOpen: false,
		buttons: [],
		closeOnEscape: false,
		draggable: false,
		resizable: false,
		show: 'slow',
		open: function() {
			$(this).parent().children().children("a.ui-dialog-titlebar-close").remove();
		}
	});
}
/*
 * initializes based on data
 */
function initWithData(){
	
	//$('#status-window').dialog('close');
	if(sectionData[orderGroupIndex]["VoIP"] && sectionData[orderGroupIndex]["VoIP"].items.length > 0){
		showHideNext("Pick",true);
		validatePickNumber();
		//display the select boxes ('pick your numbers view')
		$("[id$=AreaWrapper]").css("display", "none");
		showNumberTypes();
		var state = orderGroup[orderGroupIndex].shipping_addr.state_prov;
		var country = orderGroup[orderGroupIndex].shipping_addr.country;
		
		$.each(sectionData[orderGroupIndex]["VoIP"].items, function(){
			var item = this;
			switch(item.tabToShow){
			      case "local": if($("#localAreaWrapper #state_prov option").size() == 0){
			    	               drawRegions("#localAreaWrapper #state_prov", "USA", true);
			                    }else{
			                    	$("#localAreaWrapper #state_prov option[value='"+state+"']").attr("selected",true);
			                    	drawAreaCodes($("#localAreaWrapper #area_code"), state , "USA");
			                    }   
					            $("#localAreaWrapper").css("display", "block");
					            break;
			      case "intl": 	if($("#intlAreaWrapper #country option").size() == 0){
			    	               drawCountries("#intlAreaWrapper #country");
			                    }else{
			                    	$("#intlAreaWrapper #country option[value='"+country+"']").attr("selected",true);
			                    	$("#intlAreaWrapper #state_prov option[value='"+state+"']").attr("selected",true);
			                    	drawAreaCodes($("#intlAreaWrapper #area_code"), state , country);
			                    }   
					            $("#intlAreaWrapper").css("display", "block");
					            break;
			      case "tf":   	$("#tfAreaWrapper").css("display", "block");
			                    break;
			}
		});			
				
	}else{
		showHideNext("Pick",false);
		$('#status-window').dialog('close');
	}
	
	if(sectionData[orderGroupIndex]["Phones"].macAddr){
		showHideNext("Repro",true);
		validateReproForm();
				
	}else{
		showHideNext("Repro",false);	
	}
}

/*
 * Load the order data via Ajax
 */
function retrieveOrderData(){
	$.getJSON('/?m=Sales.Create_Order&order_id='+orderId+'&action=order_details').done(function(data) {
				
		//traverse thru order groups
		$.each(data.result.order_group, function(){
			var order_group = this;
			var idx = orderGroup.length;
			one_time_tax_total[idx] = parseFloat(order_group.one_time_tax_total);
			mrc_tax_total[idx] = parseFloat(order_group.mrc_tax_total);
			one_time_total[idx] = parseFloat(order_group.one_time_total);
			mrc_total[idx] = parseFloat(order_group.mrc_total);
			shipping_cost[idx] = parseFloat(order_group.shipping_rates[0].shipping_rate);	
			var shipping_rates = order_group.shipping_rates;
			shippingMethods[idx] = [];
			$.each(shipping_rates, function(){
				var method = this;
				shippingMethods[idx][method.order_shipping_id] = {};
				shippingMethods[idx][method.order_shipping_id].rate = method.shipping_rate;
				shippingMethods[idx][method.order_shipping_id].text = method.shipping_text;
			});
			
			
			orderGroup[idx] = {};
			orderGroup[idx].order_group_id = order_group.order_group_id;
			orderGroup[idx].discount_amount = order_group.discount_amount;
			//get each tax total(one-time and monthly)
			orderGroup[idx].one_time_tax_total = order_group.one_time_tax_total;
			orderGroup[idx].mrc_tax_total = order_group.mrc_tax_total;
			//get each total(one-time and monthly)
			orderGroup[idx].one_time_total = order_group.one_time_total;
			orderGroup[idx].mrc_total = order_group.mrc_total;
			//get each group shipping information
			orderGroup[idx].shipping_addr = {};
			orderGroup[idx].shipping_addr.addr1 = order_group.shipping_address[0].addr1;
			orderGroup[idx].shipping_addr.addr2 = order_group.shipping_address[0].addr2;
			orderGroup[idx].shipping_addr.city = order_group.shipping_address[0].city;
			orderGroup[idx].shipping_addr.state_prov = order_group.shipping_address[0].state_prov;
			orderGroup[idx].shipping_addr.postal = order_group.shipping_address[0].postal;
			orderGroup[idx].shipping_addr.country = order_group.shipping_address[0].country;
			
			//get the reprovisioned phones
			orderGroup[idx].reprovisioned_phones = order_group.reprovisioned_phones;
			orderGroup[idx].orderBundles = [];
			sectionData[idx] = {};
			
			//traverse thru order bundles
			$.each(order_group.order_bundles, function(){
				
				var bundle = this;
				var bIdx = orderGroup[idx].orderBundles.length;
				//get each bundle information
				orderGroup[idx].orderBundles[bIdx] = {};
				orderGroup[idx].orderBundles[bIdx].order_bundle_id = bundle.bundle_id;
				orderGroup[idx].orderBundles[bIdx].category_id = bundle.category_id;
				orderGroup[idx].orderBundles[bIdx].order_category_id = bundle.order_category_id;
				orderGroup[idx].orderBundles[bIdx].product_id = bundle.product_id;
				
				orderGroup[idx].orderBundles[bIdx].quantity = bundle.quantity; //home many items
				orderGroup[idx].orderBundles[bIdx].discounted_price = bundle.discounted_price; //discounted price
				//get each total(one-time and monthly)
				orderGroup[idx].orderBundles[bIdx].one_time_total = bundle.one_time_total;
				orderGroup[idx].orderBundles[bIdx].mrc_total = bundle.mrc_total;
				orderGroup[idx].orderBundles[bIdx].unit_price = bundle.unit_price; //the item's price per unit
				
				orderGroup[idx].orderBundles[bIdx].description = bundle.description;//description
				orderGroup[idx].orderBundles[bIdx].name = bundle.name;//item name
				orderGroup[idx].orderBundles[bIdx].category = bundle.category;//category header
				orderGroup[idx].orderBundles[bIdx].unit_price = bundle.unit_price;//unit price
			    
				
				if(!sectionData[idx][bundle.category]){
					sectionData[idx][bundle.category] = {};
					sectionData[idx][bundle.category].header = bundle.category;
					sectionData[idx][bundle.category].items = [];
				}
				var itemsIndex = sectionData[idx][bundle.category].items.length;
				sectionData[idx][bundle.category].items[itemsIndex] = {};
				sectionData[idx][bundle.category].items[itemsIndex].name = bundle.name;
				sectionData[idx][bundle.category].items[itemsIndex].quantity = bundle.quantity;
				sectionData[idx][bundle.category].items[itemsIndex].one_time_total = bundle.one_time_total;
				sectionData[idx][bundle.category].items[itemsIndex].mrc_total = bundle.mrc_total;
				sectionData[idx][bundle.category].items[itemsIndex].unit_price = bundle.unit_price;
				sectionData[idx][bundle.category].items[itemsIndex].category_id = bundle.category_id;
				sectionData[idx][bundle.category].items[itemsIndex].description = bundle.description;//description
				if(bundle.name == "Reprovisioned Phone"){
					reproPhonesCount = bundle.quantity;
					sectionData[idx][bundle.category].macAddr = [];
				}
				if(bundle.category == "VoIP"){
					sectionData[idx][bundle.category].items[itemsIndex].tabToShow = (bundle.name.indexOf("Local") != -1) ? "local" :  (bundle.name.indexOf("International") != -1) ? "intl" : (bundle.name.indexOf("Toll") != -1) ? "tf" : "";

  			    }
				
				orderInfo[orderId][orderGroup[idx].order_group_id] = {};
				orderInfo[orderId][orderGroup[idx].order_group_id].phoneNumbers = [];
				orderInfo[orderId][orderGroup[idx].order_group_id].macAddrs = [];
				orderInfo[orderId][orderGroup[idx].order_group_id].one_time_tax_total = 0;
				orderInfo[orderId][orderGroup[idx].order_group_id].mrc_tax_total = 0;
				orderInfo[orderId][orderGroup[idx].order_group_id].one_time_total = 0;
				orderInfo[orderId][orderGroup[idx].order_group_id].shipping_cost = 0;
				orderInfo[orderId][orderGroup[idx].order_group_id].mrc_total = 0;
			});
		});
		
		$('.review_results').display_review();
		initWithData();
	});
}

/*
 * Get State Code
 */
/*
function getStateCode(state){
	for(s in states){
		if(states.hasOwnProperty(s)){
			if(states[s] == state) return s;
		}
	}
}
*/
/*
	 * Change country 
	 **/
	
function countrySelectorHandler(){
	// Country selector
$('#country').change(function()
{

	if($(this).val())
	{
		if($(this).find(':selected').hasClass('requires_state_prov'))
		{
			$('#state_prov').rules('add', { required: true, messages: { required: 'State / Province is required' } });
			$('#state_prov').empty().append('<option value="">Loading...</option>');

			var country = $(this).val();

			$.ajax({
				url: '/?m=Sales.Create_Order&action=state_prov_list',
				type: 'GET',
				dataType: 'JSON',
				data: { mode: 'Sales.Create_Quote', action: 'state_prov_list', country: country},
				success: function(data)
				{
					$('#state_prov').empty().append('<option value="">Select</option>');

					//confirm(data.guid);
					if(data && data.state_prov_list)
					{
						$('#state_prov').removeAttr('disabled').removeClass('ui-state-disabled');

						for(i in data.state_prov_list)
						{
							$('#state_prov').append('<option value="'+i+'">'+data.state_prov_list[i]+'</option>');
						}

						$('#state_prov').sort_select_box();
					}
					else
					{
						$('#state_prov').removeAttr('disabled').removeClass('ui-state-disabled');

						if(data && data.results)
						{
							for(i in data.results)
							{
								$('#state_prov').append('<option value="'+i+'">'+data.results[i]+'</option>');
							}
						}

						$('#state_prov').sort_select_box();
					}
					stateLoaded = true;
				},
				complete: function()
				{
				}
			});
		}
		else
		{
			$('#state_prov').rules('remove', 'required');
			$('#state_prov').empty().attr('disabled', 'disabled').addClass('ui-state-disabled');
		}

		if($(this).find(':selected').hasClass('requires_postal_code'))
		{
			$('#postal').rules('add', { required: true, messages: { required: 'Postal code is required' } });
			$('#postal').removeAttr('disabled');
		}
		else
		{
			$('#postal').rules('remove', 'required');
			$('#postal').val('').attr('disabled', 'disabled');
		}
	}
  });
}

/*
 * retrieve address for shipping form
 */
/*
function retrieveAddrFromPostal(){

    (function($) {
        $(function() {
           var elements = {
                country: $('#form_Shipping #country'),
                state: $('#form_Shipping #state_prov'),
                city: $('#form_Shipping #city'),
                zip: $('#form_Shipping #postal')
            }

            // Initialize the ziptastic and bind to the change of zip code
            elements.zip.ziptastic()
                .on('zipChange', function(evt, country, state, city, zip) {
                    elements.country.val("USA");
                    elements.state.val(getStateCode(state));
                    elements.city.val(city);
                });
        });
    }(jQuery));

}
*/

/*
 * Draw countries options
 */

function drawCountries(el){
	$(el).empty().append('<option value="">Loading...</option>');
	if(countriesArray.length > 0){
		$(el).empty();
		for(var key in countriesArray){
			if(countriesArray.hasOwnProperty(key)){
				$(el).append("<option value='"+key+"'>"+countriesArray[key].full_name+"</option>");
			}
		}
		$(el).sort_select_box();
		$(el).val(orderGroup[orderGroupIndex].shipping_addr.country).attr("selected", true);
		var regionSelect = $(el).parent().find("#state_prov");
		$(el).change(function(){
			drawRegions(regionSelect, $(el).val(), true);
		});
		drawRegions(regionSelect,$(el).val(), true);
	}else{
		$.getJSON('/?m=Sales.Create_Order&action=country_list').done(function(data) {
			var countries = data.country_list;
			$(el).empty();
			$.each(countries, function(key, value){
				$(el).append("<option value='"+key+"'>"+value.full_name+"</option>");
				countriesArray[key] = value;
			});
			$(el).sort_select_box();
			$(el).val(orderGroup[orderGroupIndex].shipping_addr.country).attr("selected", true);
			var regionSelect = $(el).parent().find("#state_prov");
			$(el).change(function(){
				drawRegions(regionSelect, $(el).val(), true);
			});
			drawRegions(regionSelect,$(el).val(), true);
			
		});
	}	
}
/*
 * Draw the regions (states) options 
 */

function drawRegions(el, country, showAreaCodes){
	var countryCode = country;
	$(el).empty().append('<option value="">Loading...</option>');
	
	if(statesArray[country]){
		$(el).empty();
		for(var key in statesArray[country]){
			if(statesArray[country].hasOwnProperty(key)){
				$(el).append("<option value='"+key+"'>"+statesArray[country][key]+"</option>");
			}
		}
		$(el).sort_select_box();
		$(el).val(orderGroup[orderGroupIndex].shipping_addr.state_prov).attr("selected", true);
		if(showAreaCodes){
			var areaSelect = $(el).parent().find("#area_code");
			//countprovs++;
			$(el).change(function(){
				drawAreaCodes(areaSelect, $(el).val(), countryCode);
			});
			
			 drawAreaCodes(areaSelect, $(el).val(), countryCode);
		}
		$(el).removeAttr("disabled").removeClass("disabled");
	}else{
		$.getJSON('/?m=Sales.Create_Order&action=did_regions&country_code='+countryCode).done(function(data) {
			var regions = data.result;
			$(el).empty();
			statesArray[country] = [];
			$.each(regions, function(key, value){
				$(el).append("<option value='"+key+"'>"+value+"</option>");
				statesArray[country][key] = value;
			});
			$(el).sort_select_box();
			$(el).val(orderGroup[orderGroupIndex].shipping_addr.state_prov).attr("selected", true);
			if(showAreaCodes){
				var areaSelect = $(el).parent().find("#area_code");
				//countprovs++;
				$(el).change(function(){
					drawAreaCodes(areaSelect, $(el).val(), countryCode);
				});
				
				 drawAreaCodes(areaSelect, $(el).val(), countryCode);
			}
		   $(el).removeAttr("disabled").removeClass("disabled");
	  });
	}	
}

/*
 * Draw area codes options (per state)
 */
function drawAreaCodes(el, state, country){
	var countryCode = (country) ? country : "USA"; 
	var availNums = $(el).parent().parent().find("#availableNumbers table");
	$(el).empty().append('<option value="">Loading...</option>');
	
	if(areaCodesArray[country] && areaCodesArray[country][state]){
		$(el).empty();
		for(var key in areaCodesArray[country][state]){
			if(areaCodesArray[country][state].hasOwnProperty(key)){
				$(el).append("<option value='"+key+"'>"+areaCodesArray[country][state][key]+"("+key+")</option>");
			}
		}
		$(el).sort_select_box();
        //countarea++;
        $(el).change(function(){
	           	callDisplayAvailableNumbers(availNums,  state, $(el).val(), countryCode);
	        	
	    });
                callDisplayAvailableNumbers(availNums,  state, $(el).val(), countryCode);
	}else{
	  $.getJSON('/?m=Sales.Create_Order&action=area_codes&country_code='+countryCode+'&region='+state).done(function(data) {
    	var areacodes = data.result;
    	//var availNums = $(el).parent().parent().find("#availableNumbers table");
    	$(el).empty();
    	if(!areaCodesArray[country])areaCodesArray[country] = [];
    	areaCodesArray[country][state] = [];
        $.each(areacodes, function(key, value){
        	$(el).append("<option value='"+key+"'>"+value+"("+key+")</option>");
        	areaCodesArray[country][state][key] = value;
		});
        $(el).sort_select_box();
        //countarea++;
        $(el).change(function(){
	           	callDisplayAvailableNumbers(availNums,  state, $(el).val(), countryCode);
	        	
	    });
                callDisplayAvailableNumbers(availNums,  state, $(el).val(), countryCode);
	  });
	}  
}

/*
 * Call displayAvailableNumbers
 */
function callDisplayAvailableNumbers(availNums,  state, areacode, country){
	if(!country)country = "USA";
	var group = orderGroup[currentGroupIndex];
	displayAvailableNumbers(availNums, state, country, areacode, group.order_group_id, orderId);
	
}

/*
 * Display the available numbers
 */
function displayAvailableNumbers(el, region, country, areacode, orderGroupId, orderId){
	var countryCode = country; //(country != "USA") ? country : "USA";//change to country when data available
	$.getJSON('/?m=Sales.Create_Order&action=did_list&country_code='+countryCode+'&region='+region+'&area_code='+areacode+'&order_group_id='+orderGroupId+'&order_id='+orderId).done(function(data) {
    	var numbers = data.result;
    	$(el).empty();
    	var topParent = $(el).attr("id");
    	var groupId = orderGroup[orderGroupIndex].order_group_id;
    	var _t = "<tr>";
    	
    	$.each(numbers, function(i){
        	var number = this;
        	 if(i % 3 == 0 && i < (numbers.length-1)){
        		_t += "</tr><tr>";
        	 }
        	    _t += '<td id="'+number+'"><input type="checkbox" name="availNums" id="avail_'+i+"_"+number+'" value="'+number+'" top="'+topParent+'"/> '+number+'</td>';
             
        	 if(i == numbers.length-1)  _t += "</tr>";         
		});
    	$(el).append(_t);
    	
    	$(el).parent().removeClass("ui-display-none");
        if(topParent == "intl")$('#status-window').dialog('close');
        
        //add the click event to the available numbers checkboxes
        $('#availableNumbers input[type=checkbox]').click(function(){
        	var topEl = $(this).attr("top")+"Nums";
        	var number = $(this).val();
        	var topType = $(this).attr("top");        	
        	
 			if($(this).attr("checked")){
 				
 				if(!orderInfo[orderId][groupId]["numbers"]){
 					orderInfo[orderId][groupId]["numbers"] = [];
 				}
 				//if(!sectionData[orderGroupIndex]["numbers"])sectionData[orderGroupIndex]["numbers"]=[];
 				//var numLength = sectionData[orderGroupIndex]["numbers"].length;
 				var numLength = orderInfo[orderId][groupId]["numbers"].length;
 				orderInfo[orderId][groupId]["numbers"][numLength] = number;//add the number to the section data array
 				var ul = $("#"+topEl + " #selectedNumbers ul").first();
 				var checks = this;
 				 				
 				if($(ul).children("#"+number).length == 0){//add the selected available number to the selected list
 					                                                          //if it's not there
	 		    	$(ul).append('<li id="'+number+'">'+number+' <span></span></li>');
	 		    	
	 		    	var li = $(ul).children("#"+number).first();
 			    	var span = $(li).children("span").first();
 			    	
					$(span).append(function(){
						   //add the 'selected' checkbox and attach a click event to it to remove it if clicked
						   return $('<img src="/images/icons/cross-button-icon.png" name="selectedNumbers" value="'+number+'"/>').click(function(){
							   //var numIndex = sectionData[orderGroupIndex]["numbers"].indexOf(number);
							   //sectionData[orderGroupIndex]["numbers"].splice(numIndex,1);
							   var numIndex = orderInfo[orderId][groupId]["numbers"].indexOf(number);
							   orderInfo[orderId][groupId]["numbers"].splice(numIndex,1);
							   
							   $("#transfer"+$(checks).attr("top")).removeAttr("disabled");
							   $("#"+$(checks).attr("top")+"Nums #availableNumbers input[value="+number+"]").attr('checked', false);
					    	   $("#"+$(checks).attr("top")+"Nums #availableNumbers input").removeAttr("disabled");
							   $(this).parent().parent().remove();
							   $("#"+topType+"Picked").text($('#'+topEl+' #selectedNumbers ul li').size());
						   });
					});
					
					//$(li).append(" Click to remove");
					$("#"+topEl + ' #selectedNumbers').removeClass('ui-display-none');
 			  }
 			}else{
 				var lis = $("#"+topEl+" #selectedNumbers ul li");
 				$.each(lis, function(){
 					var li = this;
 					if($(li).attr("id") == number)$(this).remove();
 				});
 				
 			}
 			
 			$("#"+topType+"Picked").text($('#'+topEl+' #selectedNumbers ul li').size());
 			
 			if($('#'+topEl+' #selectedNumbers ul li').size() == parseInt(hasVoipItems[$(this).attr("top")]["quantity"])){
 				if(!selectedNumbers[groupId]) selectedNumbers[groupId] = [];
 				if(!selectedNumbers[groupId][topType])selectedNumbers[groupId][topType] = true;
 				
            }
 			if(selectedNumbers[groupId] && selectedNumbers[groupId][topType]){
 				var attr = $(this).attr("top").capitalize();
 				$("#"+topType+"TransferWrapper input").attr("disabled", true);
 				$("#"+$(this).attr("top")+"TransferWrapper #move"+ attr+"Number").hide();
 				$("#"+topEl+" #availableNumbers input").attr("disabled", true);
 			}
 			if(orderInfo[orderId][groupId]["numbers"] && orderInfo[orderId][groupId]["numbers"].length == hasVoipItems.total){
 				$("#form_Pick .nav_next_button").removeAttr("disabled");
 			}
 			
 		}); 
        if(selectedNumbers[groupId]){
  		  if(selectedNumbers[groupId][topParent])disablePick(topParent);
        }
	});
}

/*
 * Get shipping rates if address changed by customer
 */

function getShippingRates(json, guid){
	$.getJSON('/?m=Sales.Create_Order&order_id='+orderId+'&action=shipping&order_group_id='+guid+'&address='+JSON.stringify(json, null, 2)).done(function(data) {
		var newShippingRates = (typeof data.result == "undefined")? "" : data.result;
		if(newShippingRates != ""){
			$("#shippingTypes").empty();
			var _t = "";
			$.each(newShippingRates, function(idx){
				var type = this;
				var text = type.shipping_text;
				var rate = type.shipping_rate;
				var id = type.order_shipping_id;
				var isChecked = (idx == 0)? 'checked' : "";
				if(idx == 3){
					_t +='<div id="moreShipMethods" style="display:none;">';
				}
				_t += '<div class="form_element"><input class="ui-widget ui-corner-all no_sync shipping_method" type="radio" name="shippingMethod" value="'+id+'" '+isChecked+'/></div>';
				_t += '<div class="form_label" category_id="shipping" description="'+text+'">'+text+'</div>';
				_t += '<div class="shippingAmount">$'+rate+'</div>';
				_t += '<div class="form_clear"></div>';
				if(idx == 2 && idx < $(newShippingRates).length -1){
					_t += '<div id="moreMethods">(<span>more</span>)</div>';
				}
				if(idx == $(newShippingRates).length -1 && idx > 2)_t += '</div>';
			});
			$("#shippingTypes").append(_t);
			toggleDiv($("#moreMethods span"), $("#moreShipMethods"));
			stateLoaded = false;
		}else{
			$("#displayError").text("Error: Address given is incorrect. Please modify the address.");
		}
	});
}

/*
 * Validate payment form 
 */
function validatePaymentForm(){
	$('#form_Payment').validate({
		errorDiv: 'validation-block-Shipping',
		ignore: '',
		rules: {
				addr1: {
						required: true,
						street: true,
						rangelength: [ 5, 36 ]
					
				},
				addr2: {
						required: false,
						street: true,
						maxlength: 36
				},
				city: {
						required: true,
						city: true,
						rangelength: [ 2, 36 ]
				},
				state_prov: {
					    required: true
				},
				postal: {
					    required: true,
					    minlength : 5,
					    maxlength: 5
				},
				country: {
						required: true
				},
				fullName:{
					required: true,
					lettersonly: true,
					rangelength: [ 2, 72 ]
				},
				ccNumber:{
					required: true,
					creditcard: true,
					minlength:16,
					maxlength: 16
				},
				expMonth:{
					required: true
				},
				expYear: {
					required: true
				},
				ccv: {
					required: true,
					digits: true,
					minlength: 3,
					maxlength: 3
				}, 
				correctAddr:{
					required: true
				}
		
		},
		messages: {
			addr1: {
				required: "Street Address is required",
				street: "Invalid street address",
				rangelength: "Invalid street address length"
			},
			addr2: {
				street: "Invalid additional street address info",
				maxlength: "Additional street address info may only be 36 characters"
			},
			state_prov: {
				required: "State is required"
			},
			postal: {
				required: "Zip code is required",
				minlength : "Minimum 5 digits for zip code",
				maxlength: "Maximum 5 digits for zip code"
			},
			city: {
				required: "City is required",
				city: "Invalid city",
				rangelength: "Invalid city length"
			},
			country: {
				required: "Country is required"
			},
			fullName:{
				required: "Card holder name is required",
				lettersonly: "Card holder name can not have numbers in it",
				rangelength: "Invalid name length"
			},
			ccNumber:{
				required: "Credit card number is required",
				digits: "Credit card number should not include letters",
				minlength:"Credit Card number should have at least 16 digits",
				maxlength: "Credit Card number should have maximum 16 digits"
			},
			expMonth:{
				required: "Card expiration month is required"
			},
			expYear: {
				required: "Card expiration year is required"
			},
			ccv: {
				required: "CCV is required",
				digits: "CCV must be digits only",
				minlength: "CCV should have minimum of 3 digits",
				maxlength: "CCV should have maximum of 3 digits"
			}
			
		}
	});
}

/*
 * Validate shipping form 
 */
function validateShippingForm(){
	$('#form_Shipping').validate({
		errorDiv: 'validation-block-Shipping',
		ignore: '',
		rules: {
				addr1: {
						required: true,
						street: true,
						rangelength: [ 5, 36 ]
					
				},
				addr2: {
						required: false,
						street: true,
						maxlength: 36
				},
				city: {
						required: true,
						city: true,
						rangelength: [ 2, 36 ]
				},
				state_prov: {
					    required: true
				},
				postal: {
					    required: true,
					    minlength : 5,
					    maxlength: 5
				},
				country: {
						required: true
				},
				shippingMethod:{
					required: true,
				},
				correctAddr:{
					required: true
				}
		
		},
		messages: {
			addr1: {
				required: "Street Address is required",
				street: "Invalid street address",
				rangelength: "Invalid street address length"
			},
			addr2: {
				street: "Invalid additional street address info",
				maxlength: "Additional street address info may only be 36 characters"
			},
			state_prov: {
				required: "State is required"
			},
			postal: {
				required: "Zip code is required",
				minlength : "Minimum 5 digits for zip code",
				maxlength: "Maximum 5 digits for zip code"
			},
			city: {
				required: "City is required",
				city: "Invalid city",
				rangelength: "Invalid city length"
			},
			country: {
				required: "Country is required"
			},
			shippingMethod:{
				required: "Shipping method is required",
			},
			correctAddr:{
				required: "Check checkbox if the address entered is correct"
			}
		}
	});
}

/*
 * Validate the pick your number form
 */
function validatePickNumber(){
	$('#form_Pick').validate({
		errorDiv: 'validation-block-Shipping',
		ignore: '',
		rules: {
			availableNumbers: {
				required: true
			}/*,
			transferLocal: {
				phone: true
			},
			tollFreeToTransfer: {
				phone: true
			},
			transferIntl:{
				phone: true
			}*/
		},
		messages: {
			availableNumbers: {
				required: "You need to pick at least one number"
			}/*,
			transferLocal:{
				phone: "The phone number format is incorrect"
			},
			tollFreeToTransfer: {
				phone: "The phone number format is incorrect"
			},
			transferIntl:{
				phone: "The phone number format is incorrect"
			}*/
		}
	});	
}

/*
 * Validate the reprovisioning form
 */
function validateReproForm(){
	$('#form_Repro').validate({
		errorDiv: 'validation-block-Shipping',
		ignore: '',
		rules: {
			macAddr: {
				required: true,
				macaddress: true,
				minlength: 12,
				maxlength: 12
			}
		},
		messages: {
			macAddr: {
				required: "Mac address is required",
				macaddress: "Incorrect format for Mac Address",
				minlength: "Mac address is too short",
				maxlength: "Mac address is too long"
			}
		}
	});	
}

/*
 * Validate the EchoSign form
 */
function validateEchoSignForm(){
	$('#form_Sign').validate({
		errorDiv: 'validation-block-Shipping',
		ignore: '',
		rules: {
			verifyE: {
				required: true,
				email: true
			}
		},
		messages: {
			verifyE: {
				required: "Email address is required",
				email: "Email entered incorrectly"
			}
		}
	});	
}

/*
 * toggles a div
 */
function toggleDiv(el1, el2){
	
	if(arguments.length > 1){
		$(el1).click(function(){
			if($(el2).is(':visible')){
				$(el2).hide();
			}		
			else{
				$(el2).show();
				if(el1.parent().attr("id") == "moreMethods")el1.parent().hide();
			}
		});
	}else{
		if($(el1).is(':visible'))$(el1).hide();
		else $(el1).show();
	}
}

/*
 * populate shipping methods
 */
function populateShippingMethods(){
	var shippingTypes = $("#shippingMethod #shippingTypes");
	$(shippingTypes).empty();
	var methods = shippingMethods[orderGroupIndex];
	var j = 0;
	for(var method in methods){
		if(methods.hasOwnProperty(method)){
			var checked = (j == 0) ? "checked" : "";
			if(j == 3){
				$(shippingTypes).append('<div id="moreShipMethods" style="display:none;"></div>');
				shippingTypes = $("#shippingMethod #shippingTypes #moreShipMethods");
			}
			$(shippingTypes).append('<div class="form_element"><input class="ui-widget ui-corner-all no_sync shipping_method" type="radio" name="shippingMethod" value="'+method+'" '+checked+'></div>');
			$(shippingTypes).append('<div class="form_label" category_id="shipping" description="UPS">'+methods[method].text+'</div>');
			$(shippingTypes).append('<div class="shippingAmount">'+methods[method].rate+'</div>');
			$(shippingTypes).append('<div class="form_clear"></div>');
			if(j == 2){
				$(shippingTypes).append('<div id="moreMethods">(<span>more</span>)</div>');
			}
	        
			j++;
		}
	}
	toggleDiv($("#shippingMethod #moreMethods span"), $("#moreShipMethods"));	
}
/*
 * checks for more order groups, if there more, 
 * show the shipping view again with the next order group shipping information.
 */

function showNextOrderGroup(direction){
  	     $("#form_Shipping #addr1").val(orderGroup[orderGroupIndex].shipping_addr.addr1).removeClass("disabled").removeAttr("disabled");
		 $("#form_Shipping #addr2").val(orderGroup[orderGroupIndex].shipping_addr.addr2).removeClass("disabled").removeAttr("disabled");
		 $("#form_Shipping #city").val(orderGroup[orderGroupIndex].shipping_addr.city).removeClass("disabled").removeAttr("disabled");
		 drawRegions("#form_Shipping #state_prov", orderGroup[orderGroupIndex].shipping_addr.country);
		 $("#form_Shipping #postal").val(orderGroup[orderGroupIndex].shipping_addr.postal).removeClass("disabled").removeAttr("disabled");
		 $("#form_Shipping #country").val(orderGroup[orderGroupIndex].shipping_addr.country).attr("selected", true).removeAttr("disabled").removeClass("disabled");
		 $("#correctAddr").attr("checked", false);
		  populateShippingMethods();
		  $('.review_results').display_review();
		  initWithData();
	
}

/*
 * Save current progress to session 
 */
function save_shipping_info()
{
	 order_group_id = orderGroup[orderGroupIndex].order_group_id;
	 //orderInfo[orderId][order_group_id] = {};
	 orderInfo[orderId][order_group_id].addr1 = $("#form_Shipping #addr1").val();
	 orderInfo[orderId][order_group_id].addr2 = $("#form_Shipping #addr2").val();
	 orderInfo[orderId][order_group_id].city = $("#form_Shipping #city").val();
	 orderInfo[orderId][order_group_id].state_prov = $("#form_Shipping #state_prov").val();
	 orderInfo[orderId][order_group_id].postal = $("#form_Shipping #postal").val();
	 orderInfo[orderId][order_group_id].country = $("#form_Shipping #country").val();
	 orderInfo[orderId][order_group_id].shippingMethod = $("#form_Shipping input[name='shippingMethod']:checked").val();
}

/*
 * what to display in the 'pick your numbers' section
 */
function showNumberTypes(){
 if(sectionData[orderGroupIndex]["VoIP"]){	
	 var items = sectionData[orderGroupIndex]["VoIP"].items || null;
	 hasVoipItems.total = 0;
     if(items != null && items.length > 0){
            $.each(items, function(){
         	      var item  = this;
	         	  if(this.name.indexOf("International") != -1){
	         		  $("#maxIntl").text(this.quantity);
	         		  hasVoipItems.intl = {};
	         		  hasVoipItems.intl.quantity = this.quantity;
	         		  hasVoipItems.total += this.quantity;
	         	  }
	         	  if(this.name.indexOf("Local") != -1){
	         		  $("#maxLocal").text(this.quantity);
	         		  hasVoipItems.local = {};
	         		  hasVoipItems.local.quantity = this.quantity;
	         		  hasVoipItems.total += this.quantity;
	         	  }
	         	  if(this.name.indexOf("Free") != -1){
	         		  $("#maxTf").text(this.quantity);
	         		  hasVoipItems.tf = {};
	         		  hasVoipItems.tf.quantity = this.quantity;
	         		  hasVoipItems.total += this.quantity;
	         	  }			    	            	  				    	            	 
            });	
            if(typeof hasVoipItems.local == "undefined")$("#maxLocal").parent().parent().hide();
            if(typeof hasVoipItems.intl == "undefined")$("#maxIntl").parent().parent().hide();
            if(typeof hasVoipItems.tf == "undefined")$("#maxTf").parent().parent().hide();
     }    
 }  
}
/*
 * bottom icon navigation 
 */
function navigateIcons(){
	
	$(".navtabs_text.icons").click(function(){
		    var type = $(this).attr("id").split("_")[1];
		    if(type == "Pick"){
			 //get the items for the current order group
			 showNumberTypes();
            }
		    if(type == "Terms"){
		    	$(".review_title, #review_panel").hide();
		    }
		    $('#form_components .form_category_div').addClass('ui-tabs-hide');
			$('#form_container #'+type).removeClass('ui-tabs-hide');
			$(".navtabs_text.icons").parent().parent().removeClass('ui-state-active');
			$(this).parent().parent().addClass('ui-state-active'); 
		
	})
}

/*
 * utility function for the navigation
 */
function showNext(name){
	showHideNext(name,true);
	$('#form_container #'+name).removeClass('ui-tabs-hide');
	$("#form_categories li").removeClass('ui-state-active');
    $('#icon_'+name).parent().parent().addClass('ui-state-active'); 
}

/*
 * hide unused sections
 */
function showHideNext(name,show){
	if(show){
		$('#form_components #'+name+'.form_category_div').show();
		$('#icon_'+name).parent().parent().show();
	}else{
		$('#form_components #'+name+'.form_category_div').hide();
		$('#icon_'+name).parent().parent().hide();
	}
}

/*
 * traverse order group
 */
function traverseOrderGroup(selected, val){
	if(selected){
		if($("#correctAddr").is(":checked")){save_shipping_info();}	
		orderGroupIndex = parseInt(val);
	    showNextOrderGroup(true,true);
		showNext("Shipping");	
		//showCompleted(orderGroup[orderGroupIndex].order_group_id);
		
	}else{
		if(orderGroup.length > 1 && orderGroupIndex < orderGroup.length -1){
			   orderGroupIndex ++;
			   showNextOrderGroup(true,true);			  
			   var elToSelect = $(".ddcommon  .ddChild ul li[id='"+orderGroup[orderGroupIndex].order_group_id+"']:first");
			   $(".ddcommon  .ddChild ul li").removeClass("selected");
			   $(elToSelect).addClass("selected");
			   $(".ddTitleText .ddlabel").empty();
			   $(".ddTitleText .ddlabel").text($(elToSelect).children(".ddlabel").text());
			   if($(elToSelect).hasClass("completed")){
			    $(".ddTitleText .ddlabel").addClass("completed");
			   }else{
			      $(".ddTitleText .ddlabel").removeClass("completed");
		       }
		       $(".ddTitleText .ddlabel").attr("id", $(elToSelect).attr("id")+"_title"); 	   
			   $(".dd.ddcommon .ddChild").hide();
			   showNext("Shipping");
		}else{
			   $('.review_results').display_review(true);
			   showNext("Payment");									            		  
		}
	}	
	if(completedOrderGroups.length == orderGroup.length){
		showNext("Payment");
		showHideNext("Terms",true);
	}
}
/*
 * show completed - if an order group is completed 
 */
function showCompleted(groupId){
	$(".ddcommon  .ddChild ul li[id='"+groupId+"']").addClass("completed");
	$(".ddTitleText .ddlabel").empty();
	if((orderGroupIndex+1) < orderGroup.length){
		var index = orderGroupIndex+1;
	}else{
		var index = orderGroupIndex;
	}	
		var nextAddr = $(".ddcommon .ddChild ul li[value='"+index+"']:first .ddlabel").text();
		var nextLi = $(".ddcommon .ddChild ul li[value='"+index+"']");
		$(".ddTitleText .ddlabel").text(nextAddr);
		if($(nextLi).hasClass("completed")){
		    $(".ddTitleText .ddlabel").addClass("completed");
		}else{
		      $(".ddTitleText .ddlabel").removeClass("completed");
	    }
	    $(".ddTitleText .ddlabel").attr("id", $(nextLi).attr("id")+"_title");
	   
	if(!completedOrderGroups[groupId]) completedOrderGroups[groupId] = true;
}

/*
 * Disable the 'pick your numbers view
 */
function disablePick(tab){
	var tabCap = tab.capitalize();
	$(this).attr("disabled", true);
	$("#"+tab+"TransferWrapper input").attr("disabled", true);
	$("#"+tab+"TransferWrapper #move"+tabCap+"Number").hide();
	$("#transfer"+tabCap).attr("disabled", true);
	$("#"+tab+"Nums #availableNumbers input[name='availNums']").attr("disabled", true);
}

/*
 * Change View
 **/
function changeView(direction){
		var curTabPanel = $('#form_components .form_category_div:not(.ui-tabs-hide)').attr('id');
		var nextTabPanel =$('#form_components .form_category_div:not(.ui-tabs-hide)').attr('nextTab') || null;
		var prevTabPanel = $('#form_components .form_category_div:not(.ui-tabs-hide)').attr('prevTab') || null;
		var tabNum = $('#form_components .form_category_div:not(.ui-tabs-hide)').attr('tab');
		var groupId = orderGroup[orderGroupIndex].order_group_id;
		var order_info = orderInfo[orderId][groupId]["numbers"];
		var showVoip = false;
		
		if(sectionData[orderGroupIndex]["VoIP"]){
			 //get the items for the current order group
	        var items = sectionData[orderGroupIndex]["VoIP"].items;
	        showVoip =  true;
		}
		
		if(parseInt(orderGroup[orderGroupIndex].reprovisioned_phones) > 0) hasRepro = true;
		else hasRepro = false;
				
		if($('#form_'+curTabPanel).valid() != true)
		{
			$('#icon_'+curTabPanel).parent().addClass('category_icon_error');
			return false;
		}
		else
		{
			$('#icon_'+curTabPanel).parent().removeClass('category_icon_error');
		}

		// update the review panel
		//$('.review_results').display_review();
		
		$('#form_components .form_category_div').addClass('ui-tabs-hide');
		$('#icon_'+curTabPanel).parent().parent().removeClass('ui-state-active');
	
		if(!hasRepro)showHideNext("Repro",false);
		else showHideNext("Repro",true);
		
		if(!showVoip || (showVoip && items.length == 0)){
			showHideNext("Pick",false);
		}
		else showHideNext("Pick",true);
		
		if(showVoip && hasRepro){
			if(order_info && order_info.length == hasVoipItems.total && reprovisioned == reproPhonesCount){
				showCompleted(groupId);
			}  
		}else{
			if(showVoip){				
			   if(order_info && order_info.length == hasVoipItems.total){
				showCompleted(groupId);
			   }	
			}else if(hasRepro){				
			  if(reprovisioned == reproPhonesCount){
				showCompleted(groupId);
			  }	
			}else{				
				showCompleted(groupId);
			}
		}
		
		
		if(selectedNumbers[groupId]){
		  if(selectedNumbers[groupId]["local"])disablePick("local");
		  if(selectedNumbers[groupId]["intl"])disablePick("intl");
		  if(selectedNumbers[groupId]["tf"])disablePick("tf");
		}
		
		if(direction){
			if(curTabPanel == "Payment"){
				$('.nav_next_button').hide();
			}
			var nextTab;
			if(nextTabPanel && nextTabPanel != null){
				
				//switch(tabNum){
				switch(curTabPanel){
				     case "Shipping": if($("#form_Shipping").valid()){save_shipping_info();}
							          hasVoipItems = {};
				    	            
				    	              if(sectionData[orderGroupIndex]["VoIP"] && items.length > 0){
				    	            	  initWithData();
				    	            	  showNext("Pick");					    	              
					    	          }else{
					    	            	if(hasRepro){
					    	            		 showNext("Repro");							    	            
							                 }else{
								            	   if(showSign){
								            		   showNext("Sign"); 								            	     
								            	   }else{
								            		   traverseOrderGroup();
								            	   }  
							                  }
					    	            	   
					    	            }
				    	               
				              
				                       break;
				     case "Pick": if(hasRepro){
				    	             showNext("Repro");	
				    	          }else{
					            	   if(showSign){
					            		   showNext("Sign"); 
					            	   }else{
					            		   traverseOrderGroup();
					            	   }  
				                  }
				                  break;
				     case "Repro": if(showSign){
				    	               showNext("Sign");
				                  }else{
				                	  traverseOrderGroup();
				                  }
				                  break;	
				     case "Sign":  traverseOrderGroup();
					               break;    
				     case "Payment":   
				    	               $(".review_title, #review_panel").hide();
				    	               showNext("Terms"); 
						               break;             
				     default:      	   showNext(nextTabPanel); 				    	
						               break;
				}
			}
			if(nextTabPanel == "Terms" || nextTab == "Terms") $('#form_container #review_panel, #form_container .review_title').addClass('ui-tabs-hide');
		
		}else{
			if(curTabPanel == "Shopping"){
				$('.nav_prev_button').hide();
			}	
			
			var prevTab;
			
			if(prevTabPanel && prevTabPanel != null){
				switch(curTabPanel){
			     case "Shipping":   if($("#form_Shipping").valid()){save_shipping_info();}
			                        showNext("Shipping");
			                        break;  
			     case "Repro":      if(sectionData[orderGroupIndex]["VoIP"] && items.length > 0){
			    	                     showNext("Pick");	
					          	    }else{
					          	    	showNext("Shipping");
					         	    } 	
			                        break;
				 case "Sign":      if(hasRepro){
					                    showNext("Repro");
					               }else{
					            	    if(sectionData[orderGroupIndex]["VoIP"] && items.length > 0){
					            	    	showNext("Pick");	
					            	    }else{
					            	    	showNext("Shipping");
					            	    } 	
					               }
					               break;
				 case "Payment":      if(showSign){
					                         showNext("Sign");
						              }else{
						                	if(hasRepro){
						                		showNext("Repro");
							                }else{
							                	if(sectionData[orderGroupIndex]["VoIP"] && items.length > 0){
							                		showNext("Pick");
								            	 }else{
								            		 showNext("Shipping");
								            	 } 
							                }
						               }
						               break;
				      default:         showNext(prevTabPanel);  
				    	  
				}
			}		
			    
		}
		
		$('.mCSB_container.mCS_no_scrollbar').css('top', '0 !important');
		
}  



/*
 *  Create mCustomScrollbar for each right preview div 
 **/
function createCustomeScroll(el){
	if($(el).length == 1){
		$(el).mCustomScrollbar({
			scrollButtons: {
				enable: true
			},
			autoDraggerLength: true,
			advanced:{
				 updateOnBrowserResize:true, 
				 updateOnContentResize:true, 
				 autoExpandHorizontalScroll:false, 
				 autoScrollOnFocus:false
			}
		});
	}else{
	  $(el).each(function() {
		$(this).mCustomScrollbar({
			scrollButtons: {
				enable: true
			},
			autoDraggerLength: true,
			advanced:{
				 updateOnBrowserResize:true, 
				 updateOnContentResize:false, 
				 autoExpandHorizontalScroll:false, 
				 autoScrollOnFocus:false
			}
		});
	 });
  }

}

/*
 * Populate phone types for 'bring your phone'
 */
function populatePhoneList(){
	$.getJSON('/?m=Sales.Create_Order&action=phone_models').done(function(data) {
		var phones = data.result;
		var phoneSelect = $("#addPhone #phone_list");
		$.each(phones, function(i){
			var phone = this;
			var imgsrc = '/images/icons/'+ phone.display_name.replace(" ","_").toLowerCase();
			if(i == 0){
				$("#form_Repro .phone img").attr("src", imgsrc);
			}
			$(phoneSelect).append('<option value="'+imgsrc+'" name="'+phone.model+'">'+phone.display_name+'</option>');
			
		});
		  $(phoneSelect).change(function(){
			  $("#form_Repro .phone img").attr("src", $(this).val()+".png");
		  });
	});
}

/*
 * numbers to transfer
 */
function numbersToTransfer(tab){
	var tabCap = tab.capitalize(); 
	var quantity = 0;
	var numToTransfer = $("#transfer"+tabCap).val();
	var ul = $("#"+tab+"Nums #selectedNumbers ul");
	var groupId = orderGroup[orderGroupIndex].order_group_id;
	
	if(!orderInfo[orderId][groupId]["numbers"])orderInfo[orderId][groupId]["numbers"]=[];
	var numLength = orderInfo[orderId][groupId]["numbers"].length;
	orderInfo[orderId][groupId]["numbers"][numLength] = numToTransfer;//add the number to the section data array
	
	if($(ul).children("#"+numToTransfer).length == 0){
		$("#"+tab+"Nums #selectedNumbers ul").append('<li id="'+numToTransfer+'">'+numToTransfer+' <span></span></li>');
		 $("#"+numToTransfer+" span").append(function(){
			   //return $('<img src="/images/icons/cross-button-icon.png" name="selectedNumbers" value="'+numToTransfer+'"/>').click(function(){
			 return $('<div class="img" name="selectedNumbers" value="'+numToTransfer+'"></div>').click(function(){
				   var numIndex = orderInfo[orderId][groupId]["numbers"].indexOf(numToTransfer);
				   orderInfo[orderId][groupId]["numbers"].splice(numIndex,1);
				   $(this).parent().parent().remove();
				   $("#transfer"+tabCap).removeAttr("disabled");
		    	   $("#"+tab+"Nums #availableNumbers input").removeAttr("disabled");
			   });
		 });
		 //$("#"+numToTransfer).append("Click to remove");
		$('#'+tab+'Nums #selectedNumbers').removeClass('ui-display-none');
	}	
	$("#"+tab+"Picked").text($('#'+tab+'Nums #selectedNumbers ul li').size());
	if($('#'+tab+'Nums #selectedNumbers ul li').size() == parseInt(hasVoipItems[tab]["quantity"])){
		if(!selectedNumbers[groupId]) selectedNumbers[groupId] = [];
		if(!selectedNumbers[groupId][tab])selectedNumbers[groupId][tab] = true;
	}
	if(selectedNumbers[groupId] && selectedNumbers[groupId][tab]){
		$(this).attr("disabled", true);
		$("#"+tab+"TransferWrapper input").attr("disabled", true);
		$("#"+tab+"TransferWrapper #move"+tabCap+"Number").hide();
		$("#transfer"+tabCap).attr("disabled", true);
		$("#"+tab+"Nums #availableNumbers input").attr("disabled", true);
	}
	if(orderInfo[orderId][groupId]["numbers"] && orderInfo[orderId][groupId]["numbers"].length == hasVoipItems.total){
		$("#form_Pick .nav_next_button").removeAttr("disabled");
	}
}
/*
 * transfer numbers
 * in 'pick your numbers' view
 */
function transferNumbers(tab,ekey){
	var tabCap = tab.capitalize(); 
	var quantity = 0;
	var groupId = orderGroup[orderGroupIndex].order_group_id;
	
	if(ekey){
		numbersToTransfer(tab);
	}else{
		
	  if(!$("#move"+tabCap+"Number").val()){
		$("#"+tab+"TransferWrapper").append(function() {
			return $("<input type='button' id='move"+tabCap+"Number' value='Move'/>").click(function(){
				numbersToTransfer(tab);				
		    });
		});
	  }
  }
	//$(this).val("");
	/*	
	if($('#'+tab+'Nums #selectedNumbers ul li').size() == parseInt(hasVoipItems[tab]["quantity"])){
		$(this).attr("disabled", true);
		$("#"+tab+"TransferWrapper #move"+tabCap+"Number").hide();
		$("#"+tab+"Nums #availableNumbers input").attr("disabled", true);
	}
	if(orderInfo[orderId][groupId]["numbers"] && orderInfo[orderId][groupId]["numbers"].length == hasVoipItems.total){
		$("#form_Pick .nav_next_button").removeAttr("disabled");
	}*/
}

/*
 * enter repro phone's mac address
 */
function enterMacAddr(){
	if(reprovisioned < reproPhonesCount){
		var itemsLength = sectionData[orderGroupIndex]["Phones"].items.length;
		var currentMacAddr = $("#form_Repro #macAddr").val().toUpperCase();
		if(reprovisioned == 0 || (reprovisioned > 0 && currentMacAddr != sectionData[orderGroupIndex]["Phones"].macAddr[reprovisioned-1])){
			var currPhoneType = $("#form_Repro #phone_list").find(":selected").attr("name");
			sectionData[orderGroupIndex]["Phones"].macAddr[reprovisioned] = currentMacAddr.toUpperCase();
			$("#phoneList ul").append('<li>'+currPhoneType+"&nbsp;&nbsp;["+currentMacAddr+"]<div class='form_element' id='"+currentMacAddr+"'></div></li>");
			$("#phoneList ul li #"+currentMacAddr+".form_element").append(function(){
				return $("<img src='/images/icons/cross-button-icon.png' name='reproPhones' id='reproPhones' value='"+currPhoneType+"_"+currentMacAddr+"'/>").click(function(){
					$(this).parent().parent().remove();
					reprovisioned--;
					$("#addAPhoneButton").removeAttr("disabled");
				});
			});
			
			reprovisioned++;
			$("#phones #phone_count span").text(reprovisioned);
			$("#phones").show();
		}	
		if(reprovisioned == reproPhonesCount){
			$("#continue[category_id='bringYourOwn']").removeAttr('disabled');
			$("#addAPhoneButton").attr("disabled", true);
			$("#MACAddr #macAddr").attr("disabled", true);
		}
	}
}

/*
 * Initialize buttons 
 **/
function initializeEvents(){	
	//navigation buttons
	$('.nav_prev_button:not(.nav_hidden)').first().hide();
	
	$('.nav_next_button').click(function()
	{
		changeView(true);
		$('.mCSB_container.mCS_no_scrollbar').css('top', '0 !important');
		
	});

	$('.nav_prev_button').click(function()
	{
		changeView(false);
		$('.mCSB_container.mCS_no_scrollbar').css('top', '0 !important');
	});
	
	//when correct address is clicked in the shipping view
	$("#correctAddr").click(function(){
		if($("#correctAddr").attr('checked')){
			$("#form_Shipping input[type=text], #form_Shipping select").attr("disabled","disabled");
			$("#form_Shipping input[type=text], #form_Shipping select").addClass("disabled");
		}else{
			$("#form_Shipping input[type=text], #form_Shipping select").removeAttr("disabled");
			$("#form_Shipping input[type=text], #form_Shipping select").removeClass("disabled");
		}
		
	});
	
	
	//shipping zip code changed
	$("#form_Shipping input[type=text], #form_Shipping select").change(function() {
		
		var guid = $("#form_Shipping").attr("guid");
		addrJson.country = $("#form_Shipping #country").val();
		addrJson.addr1 = $("#form_Shipping #addr1").val();
		addrJson.addr2 = $("#form_Shipping #addr2").val();
		addrJson.city = $("#form_Shipping #city").val();
		addrJson.postal = $("#form_Shipping #postal").val();
		
		if(addrJson.country == "USA" || addrJson.country ==  "AUS" || addrJson.country == "CAN"){
			var internalCallback = function() 
			  {
			    return function()
			    {
			      if (!stateLoaded)
			      {
			          window.setTimeout(internalCallback);
			       
			      }else{
			    	  addrJson.state_prov = $("#form_Shipping #state_prov").val(); 
			    	  //call the json if the address json has the correct data
			  		  getShippingRates(addrJson,guid);
			  		  
			      }
			    }
			  }();

			  window.setTimeout( internalCallback);
			
		}else{
			
			addrJson.state_prov = "";
			//call the json if the address json has the correct data
			getShippingRates(addrJson,guid);
		}
		  
	});
	
	//shipping method radio buttons
	$(".shipping_method").click(function(){
		if($(this).attr('checked')){
			$('.review_results').display_review($(this));
		}
	});
	
	//count the reprovisioned phones to match the number 
	//based on what the customer entered in the quote
	$("#addAPhoneButton").click(function(){
		enterMacAddr();
	});
	
	$(".tab").click(function(){
		$("[id$=AreaWrapper]").css("display", "none");
		var tabType = $(this).attr("id").split("Nums")[0];
		$(this).find("#"+tabType+"AreaWrapper").css("display", "block");
	});
	
	//move numbers to Fonality ('pick your numbers view')
	$(".transfer").focus(function(){
		$(this).val("");
		transferNumbers($(this).attr("category"));
	});
	
	$(".transfer").keypress(function(e){
		   var code= (e.keyCode ? e.keyCode : e.which);
		   if (code == 13) {
			   transferNumbers($(this).attr("category"), true);
			 
		   }
    });
	
	$("#MACAddr #macAddr").keypress(function(e){
		   var code= (e.keyCode ? e.keyCode : e.which);
		   if (code == 13) {
			   enterMacAddr();
			   e.preventDefault();
		   }
    });
	
	
	$(".arrow").click(function() {
		if($(".dd.ddcommon .ddChild").is(':visible')){
		  $(".dd.ddcommon .ddChild").hide();
		}else{
		   $(".dd.ddcommon .ddChild").show();
		}
	});
	
	$(".ddcommon  .ddChild ul li").click(function(){
	       $(".ddcommon  .ddChild ul li").removeClass("selected");
		   $(this).addClass("selected");
		   $(".ddTitleText .ddlabel").empty();
		   $(".ddTitleText .ddlabel").text($(this).children(".ddlabel").text());
		   if($(this).hasClass("completed")){
		    $(".ddTitleText .ddlabel").addClass("completed");
		   }else{
		      $(".ddTitleText .ddlabel").removeClass("completed");
	       }
	       $(".ddTitleText .ddlabel").attr("id", $(this).attr("id")+"_title"); 	   
		   $(".dd.ddcommon .ddChild").hide();
		   orderGroupIndex = $(this).val();
		   traverseOrderGroup(true, $(this).val());
	});
	
}

/*
	 * Update the review panel by selector 
	 **/
	
	$.fn.display_review = function(el)
		{
			var e = $(this);
			var order_group_id = orderGroup[orderGroupIndex].order_group_id;
			
			//initially, we load everything from the JSON object
			if(arguments.length == 0){	
				    $(e).empty();
					if($(".review_title").length == 0)$('<div class="review_title">Summary</div>').insertBefore($(e));
					var review_table = $('<table id="review_table" cellspacing="0"></table>');
					var t = '';
					var prevHeader = "";
					var sectionIndex = 0;	
					//get the current totals
					total_price = (one_time_total[orderGroupIndex] + one_time_tax_total[orderGroupIndex]).toFixed(2);
					total_mrc = (mrc_total[orderGroupIndex] + mrc_tax_total[orderGroupIndex]).toFixed(2);
					
					
					//traverse through the sections
					for(sectionHeader in sectionData[orderGroupIndex]){
						if(sectionData[orderGroupIndex].hasOwnProperty(sectionHeader)){
							var data = sectionData[orderGroupIndex][sectionHeader];
							var items = data.items;			
														
						    //section header
							if(sectionHeader != prevHeader){
								t += '<tr class="review_column"><td class="first"><h5 id="'+sectionHeader+'" style="background-image: url(/iconify?w=8&h=8&icon='+encodeURIComponent(sectionHeader)+');" class="review_icon">'+sectionHeader+'</h5></td>';
							
								if(sectionIndex == 0){
			 						t += '<td><h5>Price</h5><td><h5>One-Time</h5></td><td class="last"><h5>Monthly</h5></td>';
			 					}else{
			 						t += '<td>&nbsp;</td><td>&nbsp;</td><td class="last">&nbsp;</td>';
			 					}
		 					    t += '</tr>';
							}
							orderInfo[orderId][order_group_id][sectionHeader] = {};
							/* section items */
							$.each(items, function(){	
								var item = this;
							  	var itemOneTimePrice = (parseInt(item.one_time_total) == 0) ? "&nbsp;" : '$'+ parseFloat(item.one_time_total).toFixed(2);
								var itemMrcPrice = (parseInt(item.mrc_total) == 0) ? "&nbsp;" : '$'+ parseFloat(item.mrc_total).toFixed(2);
								//populate the order
								orderInfo[orderId][order_group_id][sectionHeader][item.name] = {};
								orderInfo[orderId][order_group_id][sectionHeader][item.name].unit_price = item.unit_price;
								orderInfo[orderId][order_group_id][sectionHeader][item.name].one_time_total = itemOneTimePrice;
								orderInfo[orderId][order_group_id][sectionHeader][item.name].mrc_total = itemMrcPrice;
								
								//item quantity and description
								t += '<tr class="review_column data"><td class="first"><div class="review_label" category_id="Review" description="'+ item.description+'">'+item.quantity+' - '+ item.name+'</div></td>';
								//unit price
								t += '<td><div class="review_amount">$'+item.unit_price+'</div></td>';
								//one-time price
								t += '<td><div class="review_amount">'+itemOneTimePrice+'</div></td>';
								
								//monthly price
								t += '<td class="last"><div class="review_amount">'+itemMrcPrice+'</div></td></tr>';
							
						   });
							prevHeader = sectionHeader;
							sectionIndex++;
						}
					}
					$(review_table).append(t);
					
					// Discount section
					var discounts = '<tr class="review_column"><td class="first"><h5 id="total_discounts" class="review_icon">Discounts</h5></td>';
					//remove the bellow hard code data when we get the data from the BE and move the above line into the 'if' statment
					discounts += '<td>&nbsp;</td><td>&nbsp;</td><td class="last">&nbsp;</td></tr>';
					discounts += '<tr class="review_column data"><td class="first"><div class="review_label" category_id="Review" description="50% off 331">50% off 331</div></td><td>&nbsp;</td><td>&nbsp</td><td class="last">';
					discounts += '<div class="review_amount green">($25)</div></td></tr>';
					discounts += '<tr class="review_column data"><td class="first"><div class="review_label" category_id="Review" description="Manager (5%)">Manager (5%)</div></td><td>&nbsp;</td><td>&nbsp</td><td class="last">';
					discounts += '<div class="review_amount green">($9.25)</div></td></tr>';
					//END remove the bellow hard code data when we get the data from the BE
					
					 $(review_table).append(discounts); //move this line into the 'if' statement when we change the hard coded lines to dynamic
					// End Discount Section
					 
					//taxes & fees section
					var taxes_and_fees = '<tr class="review_column"><td class="first"><h5 id="total_discounts" class="review_icon">Taxes/Fees</h5></td>';
					taxes_and_fees += '<td>&nbsp;</td><td><div class="review_amount">'+parseFloat(one_time_tax_total[orderGroupIndex]).toFixed(2)+'</div></td><td class="last"><div class="review_amount">'+parseFloat(mrc_tax_total[orderGroupIndex]).toFixed(2)+'*</div></td>';
					taxes_and_fees += '</tr>';
					$(review_table).append(taxes_and_fees);
					//End taxes & fees section
		
					// Display totals
					var totals = '<tr class="review_column">';
					totals += '<td class="first"><h5 id="total_price" class="review_icon">Totals</h5></td>';
					totals += '<td>&nbsp;</td><td><div class="review_amount total">$'+parseFloat(total_price).toFixed(2)+'</div></td>';//Math.ceil(total_price)
					totals += '<td class="last"><div class="review_amount total">$'+parseFloat(total_mrc).toFixed(2)+'</div></td>';//Math.ceil(total_mrc)
					totals += '</tr>';
					$(review_table).append(totals);
					$(e).append(review_table);
					
					$(e).append('<div><div class="review_label" category_id="Review" description="Shipping Cost" style="width: 265px;">Shipping Cost</div><div class="review_amount total_shipping_rate">$' + shipping_cost[orderGroupIndex].toFixed(2)+ '</div>');
					$(e).append('<div><div class="review_label" category_id="Review" description="Total Cost Of Ownership" style="width: 265px;">Total Cost Of Ownership</div><div class="review_amount total final">$' + (parseFloat(total_price) + parseFloat(total_mrc) + shipping_cost[orderGroupIndex]).toFixed(2)+ '</div>');
			
					//populate the order info
					orderInfo[orderId][order_group_id].one_time_tax_total = parseFloat(one_time_tax_total[orderGroupIndex]).toFixed(2);
					orderInfo[orderId][order_group_id].mrc_tax_total = parseFloat(mrc_tax_total[orderGroupIndex]).toFixed(2);
					orderInfo[orderId][order_group_id].one_time_total = parseFloat(total_price).toFixed(2);
					orderInfo[orderId][order_group_id].mrc_total = parseFloat(total_mrc).toFixed(2);
					orderInfo[orderId][order_group_id].shipping_cost = shipping_cost[orderGroupIndex].toFixed(2);
					orderInfo[orderId][order_group_id].total = (parseFloat(total_price) + parseFloat(total_mrc) + shipping_cost[orderGroupIndex]).toFixed(2);
					
					createCustomeScroll(e);
			
			 			 			 			
		}else{
			if(typeof el === "boolean"){
				var idx = 0;
				var totalPay = 0;
				var totalShipping = 0;
				var prevSecHdr = "";
				$("#review_table").empty();
				var review_table = $("#review_table");
				var printable = "<html><head><title>Summary</title>";
				printable += "<link href='/css/Sales.Create_Quote.css' rel='stylesheet' type='text/css'/>";
				printable += "<link href='/css/Sales.Create_Order.css' rel='stylesheet' type='text/css'/>";
				printable += "</head><body><div class='review_title' style='width:100%;'>Summary</div><div id='review_panel' class='review_results' style='width:100%; height: 100%; overflow-x: visible; overflow-y: visible;'><table id='review_table' cellspacing='0' style='height: 100%;'>";
								
				$.each(orderGroup, function(i){
					var group = this;
					var oneTimeTotal = 0;
					var mrcTotal = 0;
					var content = '<tr class="addrHdr"><td colspan="4"><h4>'+group.shipping_addr.addr1+'</h4></td></tr>';
					for(sectionHeader in sectionData[i]){
						if(sectionData[i].hasOwnProperty(sectionHeader)){
							var data = sectionData[i][sectionHeader];
							var items = data.items;
							//section header
							if(sectionHeader != prevSecHdr){
								content += '<tr class="review_column"><td class="first"><h5 id="'+sectionHeader+'" style="background-image: url(/iconify?w=8&h=8&icon='+encodeURIComponent(sectionHeader)+');" class="review_icon">'+sectionHeader+'</h5></td>';
								if(idx == 0){
									content += '<td><h5>Price</h5><td><h5>One-Time</h5></td><td class="last"><h5>Monthly</h5></td>';
								}else{
			 						content += '<td>&nbsp;</td><td>&nbsp;</td><td class="last">&nbsp;</td>';
			 					}
								content += '</tr>';							
							}
							/* section items */
							$.each(items, function(){	
								var item = this;
							  	var itemOneTimePrice = (parseInt(item.one_time_total) == 0) ? "&nbsp;" : '$'+ parseFloat(item.one_time_total).toFixed(2);
								var itemMrcPrice = (parseInt(item.mrc_total) == 0) ? "&nbsp;" : '$'+ parseFloat(item.mrc_total).toFixed(2);
								oneTimeTotal += parseFloat(item.one_time_total);
								mrcTotal = parseFloat(item.mrc_total);
																
								//item quantity and description
								content += '<tr class="review_column data"><td class="first"><div class="review_label" category_id="Review" description="'+ item.description+'">'+item.quantity+' - '+ item.name+'</div></td>';
								//unit price
								content += '<td><div class="review_amount">$'+item.unit_price+'</div></td>';
								//one-time price
								content += '<td><div class="review_amount">'+itemOneTimePrice+'</div></td>';
								
								//monthly price
								content += '<td class="last"><div class="review_amount">'+itemMrcPrice+'</div></td></tr>';
								
						   });
							 prevSecHdr = sectionHeader;	
		 					 idx++;	 					 		 					 
						}
					}	
					printable += content;
					$(review_table).append(content);

					// Discount section
					var discounts = '<tr class="review_column"><td class="first"><h5 id="total_discounts" class="review_icon">Discounts</h5></td>';
					//remove the bellow hard code data when we get the data from the BE and move the above line into the 'if' statment
					discounts += '<td>&nbsp;</td><td>&nbsp;</td><td class="last">&nbsp;</td></tr>';
					discounts += '<tr class="review_column data"><td class="first"><div class="review_label" category_id="Review" description="50% off 331">50% off 331</div></td><td>&nbsp;</td><td>&nbsp</td><td class="last">';
					discounts += '<div class="review_amount green">($25)</div></td></tr>';
					discounts += '<tr class="review_column data"><td class="first"><div class="review_label" category_id="Review" description="Manager (5%)">Manager (5%)</div></td><td>&nbsp;</td><td>&nbsp</td><td class="last">';
					discounts += '<div class="review_amount green">($9.25)</div></td></tr>';
					//END remove the bellow hard code data when we get the data from the BE
					printable += discounts;
					 $(review_table).append(discounts); //move this line into the 'if' statement when we change the hard coded lines to dynamic
					// End Discount Section
                
				    //taxes & fees section
					var taxes_and_fees = '<tr class="review_column"><td class="first"><h5 id="total_discounts" class="review_icon">Taxes/Fees</h5></td>';
					taxes_and_fees += '<td>&nbsp;</td><td><div class="review_amount">'+group.one_time_tax_total+'</div></td><td class="last"><div class="review_amount">'+group.mrc_tax_total+'*</div></td>';
					taxes_and_fees += '</tr>';
					printable += taxes_and_fees;
					$(review_table).append(taxes_and_fees);
					//End taxes & fees section
					
					// Display totals
					oneTimeTotal += parseFloat(group.one_time_tax_total);
					mrcTotal += parseFloat(group.mrc_tax_total);
					var totals = '<tr class="review_column data">';
					totals += '<td class="first"><h5 id="total_price" class="review_icon">SubTotals</h5></td>';
					totals += '<td>&nbsp;</td><td><div class="review_amount total">$'+oneTimeTotal.toFixed(2)+'</div></td>';
					totals += '<td class="last"><div class="review_amount total">$'+mrcTotal.toFixed(2)+'</div></td>';
					totals += '</tr>';
					printable += totals;
					$(review_table).append(totals);
					
					//display shipping
					var shipping = '<tr class="review_column last">';
					shipping += '<td class="first"><h5 id="shipping" class="review_icon">Shipping</h5></td>';
					shipping += '<td>&nbsp;</td>';
					shipping += '<td class="last" colspan="2" align="left"><div class="shipping">$'+shipping_cost[i].toFixed(2)+'</div></td>';
					shipping += '</tr>';
					
					printable += shipping;
					$(review_table).append(shipping);
					totalPay += (oneTimeTotal + mrcTotal);
					totalShipping += shipping_cost[i];	
					
				});	
				printable += '</table>';
					var grandTotal = totalPay + totalShipping;	
				
				$(".total_shipping_rate").empty();
				$(".total_shipping_rate").text('$' + totalShipping.toFixed(2));
				$(".total.final").empty();
				$(".total.final").text('$' + grandTotal);
				
				printable += '<div class="review_label" category_id="Review" description="Shipping Cost" style="width: 265px;">Shipping Cost</div><div class="review_amount total_shipping_rate">$' + totalShipping.toFixed(2)+ '</div>';
				printable += '<div class="review_label" category_id="Review" description="Total Cost Of Ownership" style="width: 265px;">Total Cost Of Ownership</div><div class="review_amount total final">$' + grandTotal + '</div>';
				printable += '</div></body></html>';
				
				$("<div></div>").append(function(){
					return $("<a href='#;' id='printPanel'>Print Summary</a>").click(function(){
						    printReviewPanel(printable);
					});
				}).insertAfter($(e));
				
			}else{
				var name = $(el).attr("name");
				if(name == "shippingMethod"){
					var shippingId = $(el).val();
					var rate = shippingMethods[orderGroupIndex][shippingId].rate;
					shipping_cost = parseFloat(rate);
					$("#review_panel .total_shipping_rate:first").text("$"+shipping_cost.toFixed(2));
					$("#review_panel .total.final").text("$"+(parseFloat(total_price) + parseFloat(total_mrc) + shipping_cost).toFixed(2));
					orderInfo[orderId][order_group_id].shipping_cost = shipping_cost.toFixed(2);
					orderInfo[orderId][order_group_id].total = (parseFloat(total_price) + parseFloat(total_mrc) + shipping_cost).toFixed(2);
				}
			}
			
		}
}
	
/*
 * print review panel
 */	
function printReviewPanel(text){	
	var printWin = window.open("","printSummary");
	printWin.document.open();
	printWin.document.write(text);
	printWin.document.close();
	printWin.print();
}	

/*
 * Initial page load 
 */
function init(){
	if(window.location.hash){
		var anchor = window.location.hash.split("#")[1];
		//hide all views
		$('#form_components .form_category_div').addClass('ui-tabs-hide');
		$('#icon_'+$('#form_components .form_category_div:not(.ui-tabs-hide)').attr('id')).parent().parent().removeClass('ui-state-active');
		//show the anchor's view
		showNext(anchor); 
	}else{
			orderInfo[orderId] = [];
			
			//Create status window dialog
		    createDialog();
		    $('#status-message').text('Retrieving your order information. Please wait...');
		    $('#status-window').dialog('open');
			retrieveOrderData();
			$(document).ready(function(){
				//onPageLoad();
				toggleDiv($("#moreMethods span"), $("#moreShipMethods"));
				validateShippingForm();
				validatePaymentForm();
				
				countrySelectorHandler();
				//retrieveAddrFromPostal();
				initializeEvents();
				navigateIcons();
				//Create mCustomScrollbar for each right preview div
				createCustomeScroll($(".display_right_preview_form"));
				createCustomeScroll($("#phones #phoneList"));
				createCustomeScroll(".phoneTabs #localNums .content");
				createCustomeScroll(".phoneTabs #tfNums .content");
				createCustomeScroll(".phoneTabs #intlNums .content");
				$('#form_Shipping #state_prov').sort_select_box();
				$('#form_Shipping #country').sort_select_box();
				populatePhoneList();
						
				showHideNext("Payment",false);
				showHideNext("Terms", false);
		   });
	}		
}	
