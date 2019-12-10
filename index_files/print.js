function SetPrintCSS(isPrint)
{
   var link;

   if (document.getElementsByTagName)
      link = document.getElementsByTagName('link');
   else if (document.all)
      link = document.all.tags('link');
   else
      return;

   for (var index=0; index < link.length; index++)
   {
      if (link[index].title == 'print') 
         link[index].disabled = !isPrint;
   }
}

if (document.location.hash == '#print')
   SetPrintCSS(true);