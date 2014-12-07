Execute tests on command line with:
  java -jar solrjTesting.jar BASEDIR

The BASEDIR parameter is the slash-terminated path to the test docs. For example:
 java -jar solrjTesting.jar /home/jesse/Desktop/Search/solr-4.6.0/Testing/TestDocs/

If there are java errors ("class manifest not found", "i am java and lost", etc), these are
likely machine specific and possibly the packaging of the jar is broken. There is likely
no workaround, you would have to rebuild the .jar on your system. You can do so on the command line
with javac, or in eclipse (the better option). The inputs are the solrjTesting.java file/class,
which also needs the "commons-io..." and "solr-solrj" jars from the /dist folder in the SOLR
distribution. You can create a directory containing these three items and rebuild that way.







