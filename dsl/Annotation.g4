grammar Annotation;

annotation:
	  '@build'
	| '@build' buildSpecs?
	;

buildSpecs: (buildSpec '|>')* (buildSpec '|>'?);

buildSpec: ID | ID '(' jsonLiteral? ')';

/* BEGIN: JSON stuffs: */

jsonObject: '{' (jsonKeyValue ',')* (jsonKeyValue ','?)? '}';
jsonKeyValue: String ':' jsonLiteral;
jsonArray: '[' (jsonLiteral ',')* (jsonLiteral ','?)? ']';
jsonLiteral: jsonObject | jsonArray | Boolean | Number | String | SString;

/* END: JSON stuffs */

Boolean: 'true'|'false';
Number: '-'? Decimal;
fragment Decimal: Digit+ | '.' Digit+ | Digit+ '.' | Digit+ '.' Digit+;
fragment Digit: [0-9];

String: '"' StringCharacters? '"';
fragment StringCharacters: StringCharacter+;
fragment StringCharacter: ~["\\] | EscapeSequence;
fragment EscapeSequence: '\\' [btnfr"'\\];

SString: '\'' SStringCharacters? '\'';
fragment SStringCharacters: SStringCharacter+;
fragment SStringCharacter: ~['] | EscapeSequence;

ID: [A-Za-z0-9]+;

COMMENT: '/*' .*? '*/' -> skip;
LINE_COMMENT: '//' ~[\r\n]* -> skip;
WS: [ \t\r\n]+ -> skip;
