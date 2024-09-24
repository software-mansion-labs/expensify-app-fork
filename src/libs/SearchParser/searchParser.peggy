// short grammar poc
// accepts only 5 filters: type, date, amount, merchant, keyword
// main purpose:
// present parsers ability to validate input
// present example solution how autocomplete can be implemented

{{
  function buildFilter(operator, left, right) {
    return { operator, left, right };
  }
}}
{
  const defaultValues = {
    type: "expense",
    status: "all",
    sortBy: "date",
    sortOrder: "desc",
  };

  function applyDefaults(filters) {
    return {
      ...defaultValues,
      filters,
    };
  }

  function updateDefaultValues(field, value) {
    defaultValues[field] = value;
  }
}

query = _ filters:filterList? _ { return applyDefaults(filters); }

filterList
  = head:filter tail:(" " filter)* {
      const allFilters = [head, ...tail.map(([_, filter]) => filter)]
        .filter(Boolean)
        .filter((filter) => filter.right);
      if (!allFilters.length) {
        return null;
      }

      const keywords = allFilters.filter(
        (filter) =>
          filter.left === "keyword" || filter.right?.left === "keyword"
      );
      const nonKeywords = allFilters.filter(
        (filter) =>
          filter.left !== "keyword" && filter.right?.left !== "keyword"
      );

      const keywordFilter = buildFilter(
        "eq",
        "keyword",
        keywords.map((filter) => filter.right).flat()
      );
      if (keywordFilter.right.length > 0) {
        nonKeywords.push(keywordFilter);
      }
      return nonKeywords.reduce((result, filter) =>
        buildFilter("and", result, filter)
      );
    }

filter
= @( autocompleteFilter / typeFilter / dateFilter / amountFilter / merchantFilter/ freeTextFilter)

freeTextFilter
  = _ value:identifier _ { return buildFilter("eq", "keyword", value); }    
    

autocompleteFilter "autocomplete"
= key:keyToAutoComplete op:operator value:(identifier)? !. {
	const l = location();
 	const obj = {
    key,
    operatr: op,
    value,
    location: l,
    }
    updateDefaultValues("complete", obj);
    if(value){
    	if(key == "type"){
        	updateDefaultValues(key, value);
        }else{
    		return buildFilter(op, key, value);
        }
    }
}

keyToAutoComplete
= @("type"/
    "merchant")


// allows only predefined 
typeFilter
= "type" equals value:types {
	updateDefaultValues("type", value);
}


//validates date to be in yyyy-mm-dd format
dateFilter
= field:"date" op:operator values:date &(" "/ !.){
 	return buildFilter(op, field, values);
}

amountFilter
= field:"amount" op:operator values:amount &(" "/ !.){
	return buildFilter(op, field, values);
}

merchantFilter 
= field:"merchant" op:equals values:merchant {
	return buildFilter(op, field, values);
}

operator
  = (":" / "=") { return "eq"; }
  / "!=" { return "neq"; }
  / ">=" { return "gte"; }
  / ">" { return "gt"; }
  / "<=" { return "lte"; }
  / "<" { return "lt"; }
  
 equals "equals"
  = (":" / "=") { return "eq"; }
  
  
merchant "merchant"
= @(identifier)

 types "type" 
= @(
      "chat"
      / "expense"
      / "invoice"
      / "trips")

date "date"
= date:(year "-" month "-" day)|1.. , ","| &(" "/ ","/ !.){
	return date.map((date) => date.join(""));
}


year "year"
= values:(digit digit digit digit) {
	return values.join("");
}

month "month"
= values:( ("0"/ "1") digit){
	return values.join("");
}
      
day "day"
= values:(("0"/"1"/"2"/"3") digit){
	return values.join("");
}

amount "amount"
= values:(startDigit digit|0..6| (("." digit|1..2|))?) {
return values?.flat(2).join("");
}

startDigit
= @("1"/ "2" / "3" / "4" / "5" / "6" / "7" / "9")

digit "digit"
= @("0" / "1"/ "2" / "3" / "4" / "5" / "6" / "7" / "9")
  
identifier
  = parts:(quotedString / alphanumeric)+ {
      const value = parts.flat();
      if (value.length > 1) {
        return value;
      }
      return value[0];
    }

quotedString "quote" = "\"" chars:[^"\r\n]* "\"" { return chars.join(""); }

alphanumeric "word"
  = chars:[A-Za-z0-9_@./#&+\-\\',;]+ {
      return chars.join("").trim().split(",").filter(Boolean);
    }

logicalAnd = _ { return "and"; }

_ "whitespace" = [ \t\r\n]*
