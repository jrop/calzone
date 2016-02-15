export CLASSPATH := $(CLASSPATH):/usr/local/Cellar/antlr/4.5.1_1/antlr-4.5.1-complete.jar

.PHONY:

all:
	antlr4 -Dlanguage=JavaScript -o js/ -visitor Annotation.g4

java: .PHONY
	antlr4 -o java/ Annotation.g4
	cd java/ && javac *.java

run:
	cd java/ && grun Annotation annotation -tree < ../test

run-gui:
	cd java/ && grun Annotation annotation -gui < ../test

test: java run

clean:
	rm -rf js/ java/
