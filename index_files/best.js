$(document).ready(function(){

$("div.TipsTitle").click(function(){



$.ajax({
  url: "http://rabota.ngs.ru/myroom/resumes/todo?&state=1&owner_id=5039997&limit=25&order_by[]=sort_date&order_dir[]=desc&todo=refresh&id[]=7458357",
  cache: false,
  success: function(html){
    alert(html);
  }
});



$(this).next().slideToggle("slow");

if ($(this).hasClass('TipsTitle TitleHid'))
    {
        
$(this).removeClass("TipsTitle TitleHid").addClass("TipsTitle");
    }
else
    {
$(this).removeClass("TipsTitle").addClass("TipsTitle TitleHid");

    }
             return false;
});


$("div.OtherNewsTitle").click(function(){
        $(this).next().slideToggle("slow");

if ($(this).hasClass('OtherNewsTitle TitleHid'))
    {
        
$(this).removeClass("OtherNewsTitle TitleHid").addClass("OtherNewsTitle");
    }
else
    {
$(this).removeClass("OtherNewsTitle").addClass("OtherNewsTitle TitleHid");

    } 
             return false;
});



$("div.MyProfileTitle").click(function(){
$(this).next().slideToggle("slow");

if ($(this).hasClass('MyProfileTitle TitleHid'))

    {
        $(this).removeClass("MyProfileTitle TitleHid").addClass("MyProfileTitle");
    }
else
    {
        $(this).removeClass("MyProfileTitle").addClass("MyProfileTitle TitleHid");

    }
             return false;
});



$(".MyMessagesTitle").click(function(){
$(this).next().slideToggle("slow");

if ($(this).hasClass('MyMessagesTitle TitleHid'))

    {
        $(this).removeClass("MyMessagesTitle TitleHid").addClass("MyMessagesTitle");
    }
else
    {
        $(this).removeClass("MyMessagesTitle").addClass("MyMessagesTitle TitleHid");

    }
             return false;
});



$(".InterviewTitle").click(function(){
$(this).next().slideToggle("slow");

if ($(this).hasClass('InterviewTitle TitleHid'))

    {
        $(this).removeClass("InterviewTitle TitleHid").addClass("InterviewTitle");
    }
else
    {
        $(this).removeClass("InterviewTitle").addClass("InterviewTitle TitleHid");

    }
             return false;
});

//Конец ready


$("#touchForm, #autorize, #touchFo").ajaxForm(function() {
});


});