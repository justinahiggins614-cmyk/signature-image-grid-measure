/* Signature Math Tools — deterministic, standard math, same answers every time. */
(function(){
"use strict";
var $=function(id){return document.getElementById(id);};
var MM={mm:1,cm:10,m:1000,km:1e6,in:25.4,ft:304.8,yd:914.4,mi:1609344,px:1};
function num(id){var v=parseFloat($(id).value);return isFinite(v)?v:NaN;}

$("u-go").addEventListener("click",function(){
  var v=num("u-val"),f=$("u-from").value,t=$("u-to").value;
  if(!isFinite(v)){$("u-out").textContent="Enter a value.";return;}
  var r=v*MM[f]/MM[t];
  $("u-out").textContent=v+" "+f+" = "+(+r.toFixed(10))+" "+t;
});

$("t-go").addEventListener("click",function(){
  var a=num("t-a"),b=num("t-b"),c=num("t-c");
  var known=[isFinite(a),isFinite(b),isFinite(c)].filter(Boolean).length;
  if(known<2){$("t-out").textContent="Enter any two sides.";return;}
  if(!isFinite(c))c=Math.hypot(a,b);
  else if(!isFinite(a))a=Math.sqrt(Math.max(0,c*c-b*b));
  else if(!isFinite(b))b=Math.sqrt(Math.max(0,c*c-a*a));
  var A=Math.asin(a/c)*180/Math.PI,B=90-A;
  $("t-out").innerHTML=
    "a="+a.toFixed(4)+" · b="+b.toFixed(4)+" · c="+c.toFixed(4)+"<br>"+
    "Angles: "+A.toFixed(2)+"° and "+B.toFixed(2)+"° (right angle 90°)<br>"+
    "Area: "+(a*b/2).toFixed(4)+" · Perimeter: "+(a+b+c).toFixed(4)+
    "<br><span style='opacity:.75'>a²+b²=c² → "+(a*a).toFixed(2)+"+"+(b*b).toFixed(2)+"="+(c*c).toFixed(2)+"</span>";
});

$("p-go").addEventListener("click",function(){
  var n=Math.round(num("p-n")),s=num("p-s");
  if(!(n>=3&&n<=12)||!(s>0)){$("p-out").textContent="Sides 3–12, positive length.";return;}
  var names={3:"triangle",4:"square",5:"pentagon",6:"hexagon",7:"heptagon",8:"octagon",9:"nonagon",10:"decagon",11:"hendecagon",12:"dodecagon"};
  var ap=s/(2*Math.tan(Math.PI/n)),area=n*s*ap/2,intA=(n-2)*180/n;
  $("p-out").innerHTML="Regular "+(names[n]||n+"-gon")+": side "+s+
   "<br>Perimeter: "+(n*s).toFixed(4)+" · Apothem: "+ap.toFixed(4)+
   "<br>Area: "+area.toFixed(4)+" · Interior angle: "+intA.toFixed(2)+"°";
});

$("g-go").addEventListener("click",function(){
  var L=num("g-l");if(!(L>0)){$("g-out").textContent="Enter a positive length.";return;}
  var ph=1.618033988749895,major=L/ph,minor=L-major;
  $("g-out").innerHTML="φ = 1.6180339887…<br>Major part: "+major.toFixed(4)+
   " · Minor part: "+minor.toFixed(4)+"<br><span style='opacity:.75'>Check: major/minor = "+(major/minor).toFixed(6)+" = φ</span>";
});

function gcd(x,y){x=Math.abs(Math.round(x));y=Math.abs(Math.round(y));while(y){var t=y;y=x%y;x=t;}return x||1;}
$("a-go").addEventListener("click",function(){
  var w=num("a-w"),h=num("a-h"),fw=num("a-fw"),fh=num("a-fh");
  if(!(w>0&&h>0)){$("a-out").textContent="Enter width and height.";return;}
  if(!(fw>0&&fh>0)){$("a-out").textContent="Enter fit width and height.";return;}
  var g=gcd(w,h),sc=Math.min(fw/w,fh/h),nw=w*sc,nh=h*sc;
  $("a-out").innerHTML="Ratio: "+(w/g)+":"+ (h/g)+" ("+(w/h).toFixed(4)+":1)"+
   "<br>Fitted inside "+fw+"×"+fh+": "+nw.toFixed(1)+"×"+nh.toFixed(1)+" (no distortion)";
});

$("c-go").addEventListener("click",function(){
  var d=num("c-d");if(!(d>0)){$("c-out").textContent="Enter a positive diameter.";return;}
  var r=d/2;
  $("c-out").innerHTML="Radius: "+r.toFixed(4)+"<br>Circumference: "+(Math.PI*d).toFixed(4)+
   " (πd)<br>Area: "+(Math.PI*r*r).toFixed(4)+" (πr²)";
});
})();
