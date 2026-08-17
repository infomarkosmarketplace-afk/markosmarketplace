const exchangeRates = {

USD:1,

NAD:18.20,

EUR:0.86

};



function convertCurrency(amount, currency){

return Number(amount) * exchangeRates[currency];

}



function currencySymbol(currency){

if(currency==="NAD"){
return "N$";
}

if(currency==="EUR"){
return "€";
}

return "$";

}