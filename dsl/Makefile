export CLASSPATH := $(CLASSPATH):/usr/local/Cellar/antlr/4.5.1_1/antlr-4.5.1-complete.jar
all:
	antlr4 -o out/ Annotation.g4
	cd out/ && javac *.java

javascript:
	antlr4 -Dlanguage=JavaScript -o js/build/ -visitor Annotation.g4

run:
	cd out/ && grun Annotation annotation -tree < ../test

run-gui:
	cd out/ && grun Annotation annotation -gui < ../test

test: all run

clean:
	rm -rf js/build/ out/
