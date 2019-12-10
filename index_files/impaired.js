$(document).ready(function(){
	//$.session.clear();
	var CecutientMenuShow = 0;
    if ($.session.get("CENT_COOKIES")=="ON"){
    	CecutientMenuShow = 1;
    	$('#CecutientWrapper').css({"height":"40px"});
        CecutientOn();
        if ($.session.get("FONTS")=="SMALL"){SmallFontsNew();}
        if ($.session.get("FONTS")=="MEDIUM"){MediumFontsNew();}
        if ($.session.get("FONTS")=="BIG"){BigFontsNew();}
        if ($.session.get("IMAGE")=="ON"){ImageOnNew();}
        if ($.session.get("IMAGE")=="OFF"){ImageOffNew();}
        if ($.session.get("STYLE")=="WHITE"){WhiteStyleNew();}
        if ($.session.get("STYLE")=="BLACK"){BlackStyleNew();}
        if ($.session.get("STYLE")=="BLUE"){BlueStyleNew();}
        if ($.session.get("STYLE")=="GREEN"){GreenStyleNew();}
    } 
    /*alert($.cookie("FONTS")+'&'+$.cookie("CecutientCookie"));*/
    /*Включение стилей для слабовидящих*/
    $('#CecutientOn').click(function(){CecutientOn();});
    /*Включение выключение изображений*/
    $('#ImageOn').click(function(){ImageOn();});
    $('#ImageOff').click(function(){ImageOff();});
    /*Размер шрифта*/
    $('#SmallFonts').click(function(){SmallFonts();});
    $('#MediumFonts').click(function(){MediumFonts();});
    $('#BigFonts').click(function(){BigFonts();});
    /*Цветовая схема*/
    $('#WhiteStyle').click(function(){WhiteStyle();});
    $('#BlackStyle').click(function(){BlackStyle();});
    $('#BlueStyle').click(function(){BlueStyle();});
    $('#GreenStyle').click(function(){GreenStyle();});
    
	$('#CecutientBtn').click(function(){
		
		if(CecutientMenuShow === 0){
			CecutientOn();
			WhiteStyle();
			$('#CecutientWrapper').animate({"height":"40px"}, 500);
			/*$('#CecutientBtn').animate({"marginTop":"40px"}, 500);*/
			CecutientMenuShow = 1; 
		} else {
			
		        $.session.set("CENT_COOKIES", null);
		        $.session.set("STYLE", null);
		        $.session.set("IMAGE", null);
		        $.session.set("FONTS", null);
		        window.location.reload();
		        
		    
			$('#CecutientWrapper').animate({"height":"0px"}, 500);
			/*$('#CecutientBtn').animate({"marginTop":"0px"}, 500);*/
			CecutientMenuShow = 0; 
		}
		return false;
	});
    /*Функция обработчик включения стилей*/
    function CecutientOn(){
    	
        $('#CecutientOn').css("display","none"); 
        $('#CecutientOff').css("display","inline-block");
        $('#header1, #banner-fade, #left, #right, #BottomBanners, #AbsoluteTop, #nr, #nl').css("display","none");
        $('#CecutientTop, .TopMenu').css("display","block");
        $('#content').css({"width":"100%","padding":"0px"});
        $('#content *').css({"background":"#fff","color":"#000"});
        $('#bottom, #bottom *').css({"background":"#000","color":"#fff"});
        $('#headerline').css({"color":"#fff","background":"#000","height":"30px"});
        $('.TopMenu').css({"border":"1px solid #000","paddingTop":"10px","paddingBottom":"10px","marginTop":"10px"});
        $('.TopMenu li a').css({"background":"none","paddingTop":"0px","color":"#000"});
        $('.appointments').html("Записаться");
        $.session.set("CENT_COOKIES", "ON");
        return false;
    }
    /*Функции изменения размера шрифта*/
    function SmallFonts(){
        if ($.session.get("CENT_COOKIES")=="ON"){
            $('#layout, .bottom, #CecutientTop').removeClass("MediumFonts BigFonts empaired").addClass("SmallFonts empaired");
            $.session.set("FONTS", "SMALL");
            console.log($.session.set("FONTS"));
            return false;
        }
    }
    function MediumFonts(){
        if ($.session.get("CENT_COOKIES")=="ON"){
            $('#layout, .bottom, #CecutientTop').removeClass("SmallFonts BigFonts empaired").addClass("MediumFonts empaired");
            $.session.set("FONTS", "MEDIUM");
            console.log($.cookie("FONTS"));
            return false;
        }
    }
    function BigFonts(){
        if ($.session.get("CENT_COOKIES")=="ON"){
            $('#layout, .bottom, #CecutientTop').removeClass("SmallFonts MediumFonts empaired").addClass("BigFonts empaired");
            $.session.set("FONTS", "BIG");
            console.log($.cookie("FONTS"));
            return false;
        }
    }
    /*Функции обработчик отображения изображений*/
    function ImageOn(){
        if ($.session.get("CENT_COOKIES")=="ON"){
            $('img').css("display","inline-block");
            $('#ImageOff').css("display","inline-block");
            $('#ImageOn').css("display","none");
            $.session.set("IMAGE", "ON");
            return false;
        }
    }
    function ImageOff(){
        if ($.session.get("CENT_COOKIES")=="ON"){
            $('img').css("display","none");
            $('#ImageOff').css("display","none");
            $('#ImageOn').css("display","inline-block");
            $('#CecutientBtn img').css("display","inline-block");
            $.session.set("IMAGE", "OFF");
            return false;
        }
    }
    /*Функции изменения цветовой схема*/
    function WhiteStyle(){
    	
        if ($.session.get("CENT_COOKIES")=="ON"){
        	$('#layout, .bottom, #CecutientTop').removeClass("empaired").addClass("empaired");
            $('body, html, #layout').css("background","#fff");
            $('#content').css({"width":"100%","padding":"0px"});
            $('#layout *').css({"background":"#fff","color":"#000"});
            $('#CecutientTop').css("color","#000");
            $('.SubMenu').css("background","#fff");
            $('.SubMenu *').css("color","#000");
            $('#bottom, #bottom *').css({"background":"#000","color":"#fff"});
            $('#headerline').css({"color":"#fff","background":"#000"});
            $('.TopMenu').css({"border":"1px solid #000","paddingTop":"10px","paddingBottom":"10px","marginTop":"10px"});
            $('.TopMenu li a').css({"background":"none","paddingTop":"0px","color":"#000"});
            $('.PriceTable tr td').css("border","1px solid #000");
            $.session.set("STYLE", "WHITE");
            return false;
        }
    }
    function BlackStyle(){
    	
        if ($.session.get("CENT_COOKIES")=="ON"){
        	$('#layout, .bottom, #CecutientTop').removeClass("empaired").addClass("empaired");
            $('body, html, #layout').css("background","#000");
            $('#content').css({"width":"100%","padding":"0px"});
            $('#layout *').css({"background":"#000","color":"#fff"});
            $('#CecutientTop').css("color","#fff");
            $('.SubMenu').css("background","#000");
            $('.SubMenu *').css("color","#fff");
            $('#bottom, #bottom *').css({"background":"#fff","color":"#000"});
            $('#headerline').css({"color":"#000","background":"#fff"});
            $('.TopMenu').css({"border":"1px solid #fff","paddingTop":"10px","paddingBottom":"10px","marginTop":"10px"});
            $('.TopMenu li a').css({"background":"none","paddingTop":"0px","color":"#fff"});
            $('.PriceTable tr td').css("border","1px solid #fff");
            $.session.set("STYLE", "BLACK");
            return false;
        }
    }
    function BlueStyle(){
    	
        if ($.session.get("CENT_COOKIES")=="ON"){
        	$('#layout, .bottom, #CecutientTop').removeClass("empaired").addClass("empaired");
            $('body, html, #layout').css("background","#9DD1FF");
            $('#content').css({"width":"100%","padding":"0px"});
            $('#layout *').css({"background":"#9DD1FF","color":"#063462"});
            $('#CecutientTop').css("color","#063462");
            $('.SubMenu').css("background","#9DD1FF");
            $('.SubMenu *').css("color","#063462");
            $('#bottom, #bottom *').css({"background":"#063462","color":"#9DD1FF"});
            $('#headerline').css({"color":"#9DD1FF","background":"#063462"});
            $('.TopMenu').css({"border":"1px solid #063462","paddingTop":"10px","paddingBottom":"10px","marginTop":"10px"});
            $('.TopMenu li a').css({"background":"none","paddingTop":"0px","color":"#063462"});
            $('.PriceTable tr td').css("border","1px solid #063462");
            $.session.set("STYLE", "BLUE");
            return false;
        }
    }
    function GreenStyle(){
    	
        if ($.session.get("CENT_COOKIES")=="ON"){
        	$('#layout, .bottom, #CecutientTop').removeClass("empaired").addClass("empaired");
            $('body, html, #layout').css("background","#3B2716");
            $('#layout').css({"width":"100%","padding":"0px"});
            $('#layout *').css({"background":"#3B2716","color":"#A9E44D"});
            $('#CecutientTop').css("color","#A9E44D");
            $('.SubMenu').css("background","#3B2716");
            $('.SubMenu *').css("color","#A9E44D");
            $('#bottom, #bottom *').css({"background":"#A9E44D","color":"#3B2716"});
            $('#headerline').css({"color":"#3B2716","background":"#A9E44D"});
            $('.TopMenu').css({"border":"1px solid #A9E44D","paddingTop":"10px","paddingBottom":"10px","marginTop":"10px"});
            $('.TopMenu li a').css({"background":"none","paddingTop":"0px","color":"#A9E44D"});
            $('.PriceTable tr td').css("border","1px solid #A9E44D");
            $.session.set("STYLE", "GREEN");
            return false;
        }
    }
    /*Отключение версии для слабовидящих*/
    $('#CecutientOff').click(function(){
        $.session.set("CENT_COOKIES", null);
        $.session.set("STYLE", null);
        $.session.set("IMAGE", null);
        $.session.set("FONTS", null);
        window.location.reload();
        return false;
    });
    
    /*Функции изменения размера шрифта*/
    function SmallFontsNew(){
        if ($.session.get("CENT_COOKIES")=="ON"){
            $('#layout, .bottom, #CecutientTop').removeClass("MediumFonts BigFonts empaired").addClass("SmallFonts empaired");
            return false;
        }
    }
    function MediumFontsNew(){
        if ($.session.get("CENT_COOKIES")=="ON"){
            $('#layout, .bottom, #CecutientTop').removeClass("SmallFonts BigFonts empaired").addClass("MediumFonts empaired");
            return false;
        }
    }
    function BigFontsNew(){
        if ($.session.get("CENT_COOKIES")=="ON"){
            $('#layout, .bottom, #CecutientTop').removeClass("SmallFonts MediumFonts empaired").addClass("BigFonts empaired");
            return false;
        }
    }
    /*Функции обработчик отображения изображений*/
    function ImageOnNew(){
        if ($.session.get("CENT_COOKIES")=="ON"){
            $('img').css("display","inline-block");
            $('#ImageOff').css("display","inline-block");
            $('#ImageOn').css("display","none");
            return false;
        }
    }
    function ImageOffNew(){
        if ($.session.get("CENT_COOKIES")=="ON"){
            $('img').css("display","none");
            $('#ImageOff').css("display","none");
            $('#ImageOn').css("display","inline-block");
            $('#CecutientBtn img').css("display","inline-block");
            return false;
        }
    }
    /*Функции изменения цветовой схема*/
    function WhiteStyleNew(){
    	
        if ($.session.get("CENT_COOKIES")=="ON"){
        	$('#layout, .bottom, #CecutientTop').removeClass("empaired").addClass("empaired");
            $('body, html, #layout').css("background","#fff");
            $('#content').css({"width":"100%","padding":"0px"});
            $('#layout *').css({"background":"#fff","color":"#000"});
            $('#CecutientTop').css("color","#000");
            $('.SubMenu').css("background","#fff");
            $('.SubMenu *').css("color","#000");
            $('#bottom, #bottom *').css({"background":"#000","color":"#fff"});
            $('#headerline').css({"color":"#fff","background":"#000"});
            $('.TopMenu').css({"border":"1px solid #000","paddingTop":"10px","paddingBottom":"10px","marginTop":"10px"});
            $('.TopMenu li a').css({"background":"none","paddingTop":"0px","color":"#000"});
            $('.PriceTable tr td').css("border","1px solid #000");
            return false;
        }
    }
    function BlackStyleNew(){
    	
        if ($.session.get("CENT_COOKIES")=="ON"){
        	$('#layout, .bottom, #CecutientTop').removeClass("empaired").addClass("empaired");
            $('body, html, #layout').css("background","#000");
            $('#content').css({"width":"100%","padding":"0px"});
            $('#layout *').css({"background":"#000","color":"#fff"});
            $('#CecutientTop').css("color","#fff");
            $('.SubMenu').css("background","#000");
            $('.SubMenu *').css("color","#fff");
            $('#bottom, #bottom *').css({"background":"#fff","color":"#000"});
            $('#headerline').css({"color":"#000","background":"#fff"});
            $('.TopMenu').css({"border":"1px solid #fff","paddingTop":"10px","paddingBottom":"10px","marginTop":"10px"});
            $('.TopMenu li a').css({"background":"none","paddingTop":"0px","color":"#fff"});
            $('.PriceTable tr td').css("border","1px solid #fff");
            return false;
        }
    }
    function BlueStyleNew(){
    	
        if ($.session.get("CENT_COOKIES")=="ON"){
        	$('#layout, .bottom, #CecutientTop').removeClass("empaired").addClass("empaired");
            $('body, html, #layout').css("background","#9DD1FF");
            $('#content').css({"width":"100%","padding":"0px"});
            $('#layout *').css({"background":"#9DD1FF","color":"#063462"});
            $('#CecutientTop').css("color","#063462");
            $('.SubMenu').css("background","#9DD1FF");
            $('.SubMenu *').css("color","#063462");
            $('#bottom, #bottom *').css({"background":"#063462","color":"#9DD1FF"});
            $('#headerline').css({"color":"#9DD1FF","background":"#063462"});
            $('.TopMenu').css({"border":"1px solid #063462","paddingTop":"10px","paddingBottom":"10px","marginTop":"10px"});
            $('.TopMenu li a').css({"background":"none","paddingTop":"0px","color":"#063462"});
            $('.PriceTable tr td').css("border","1px solid #063462");
            return false;
        }
    }
    function GreenStyleNew(){
    	
        if ($.session.get("CENT_COOKIES")=="ON"){
        	$('#layout, .bottom, #CecutientTop').removeClass("empaired").addClass("empaired");
            $('body, html, #layout').css("background","#3B2716");
            $('#layout').css({"width":"100%","padding":"0px"});
            $('#layout *').css({"background":"#3B2716","color":"#A9E44D"});
            $('#CecutientTop').css("color","#A9E44D");
            $('.SubMenu').css("background","#3B2716");
            $('.SubMenu *').css("color","#A9E44D");
            $('#bottom, #bottom *').css({"background":"#A9E44D","color":"#3B2716"});
            $('#headerline').css({"color":"#3B2716","background":"#A9E44D"});
            $('.TopMenu').css({"border":"1px solid #A9E44D","paddingTop":"10px","paddingBottom":"10px","marginTop":"10px"});
            $('.TopMenu li a').css({"background":"none","paddingTop":"0px","color":"#A9E44D"});
            $('.PriceTable tr td').css("border","1px solid #A9E44D");
            return false;
        }
    }
    
    /*$('.empaired .MyProfileTitle').on('click', function(){
    	$('.empaired .MyProfileBody').show();
    })*/
});