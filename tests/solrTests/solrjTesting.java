import java.io.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.apache.solr.client.solrj.*;
import org.apache.solr.client.solrj.impl.HttpSolrServer;
import org.apache.solr.client.solrj.response.QueryResponse;
import org.apache.solr.client.solrj.response.SolrPingResponse;
import org.apache.solr.common.*;


public class solrjTesting {

	static SolrDocumentList solrQuery(SolrServer solr, String query, int rows) throws SolrServerException {
        SolrQuery solrQuery = new SolrQuery(query);
        solrQuery.setRows(rows);
        QueryResponse resp = solr.query(solrQuery);
        SolrDocumentList hits = resp.getResults();
        return hits;
    }
	
	//prints only the first 1000 chars or response, or response.length(). Whichever is shorter.
	static void printFailedResponse(String r){
		if(r.length() < 1000){
			System.out.println(r);
		}
		else{
			System.out.println(r.substring(0,1000));
		}
	}
	

    public static void printResult(PrintStream out, SolrDocument doc) {
        List<String> sortedFieldNames = new ArrayList<String>(doc.getFieldNames());
        Collections.sort(sortedFieldNames);
        out.println();
        for (String field : sortedFieldNames) {
            out.println(String.format("\t%s: %s", field, doc.getFieldValue(field)));
        }
        out.println();
    }
	
	/**
	 * @param args
	 * 
	 * Jesse's sys: to run this, cd to ~/Desktop/Search/solr/example and do java -jar start.jar
	 * Then in browser go to http://localhost:8983/solr/#/
	 * 
	 * Current configuraiton: run solr instance from ~/Desktop/Search/solr-4.6.0/example
	 * in terminal, start eclipse:
	 *   eclipse
	 *  
	 * may need to re-index via terminal, but maybe this should be added to the tests:
	 *   --delete all with an update query
	 *   --full import query
	 *   --then run tests
	 * 
	 */
	public static void main(String[] args) throws Exception{
		String baseDir = (args != null && args.length > 0) ? args[0] : "/home/jesse/Desktop/Search/solr-4.6.0/Testing/TestDocs/";
		String serverUrl = (args != null && args.length > 1) ? args[1] : "http://localhost:8983/solr/collection1";

		final int PING_SUCCESS = 0;
		
		//throws  org.apache.solr.client.solrj.SolrServerException is SOLR down; catch as test failure
		SolrServer solr = new HttpSolrServer(serverUrl);
		
		/*
        // Add some example docs
        SolrInputDocument doc1 = new SolrInputDocument();
        doc1.setField("id", "1");
        doc1.setField("screen_name_s", "@thelabdude");
        doc1.setField("type_s", "post");
        doc1.setField("lang_s", "en");
        doc1.setField("timestamp_tdt", "2012-05-22T09:30:22Z/HOUR");
        doc1.setField("favourites_count_ti", "10");
        doc1.setField("text_t", "#Yummm :) Drinking a latte at Caffe Grecco in SF's" +
          " historic North Beach... Learning text analysis with #SolrInAction by @Manning on my i-Pad");

        solr.add(doc1);
        solr.commit(true,true);

        for(SolrDocument doc : solrQuery(solr,"*:*",10)){
        	printResult(System.out, doc);
        }
        */
        
		
		
		//TC1.0. Smoke test by pinging server for issues at start. Detects server is running.
		//Check for exceptions on ping(). Handle non-zero statuses.
		SolrPingResponse r;
		try{
		  r = solr.ping();
		}
		catch(SolrServerException e){
			System.out.println("FAIL TC0.0: SolrServerException caught for url "+serverUrl+" verify SOLR instances has been started. Exception text: "+e.toString());
			return;
		}
		catch(IOException e){
			System.out.println("FAIL TC0.0: Testing aborted, IOException caught for url "+serverUrl+" verify SOLR instances has been started. Exception text: "+e.toString());
			return;
		}
		
		if(r.getStatus() == PING_SUCCESS){
			System.out.println("PASS TC1.0: ping success");	
		}
		else{
			/*TODO: map the status code. Can't find Apache lit on these codes.
			switch(r.getStatus()){
			  case 1: ...
			}
			*/
			System.out.println("FAIL TC1.0: ping() returned non-zero status. Full response follows");
			System.out.println(r.getResponse().toString());
		}
		
		/* Note we don't start with a "fresh" index state of zero documents, since the indexing operation
		 * always occurs at start-up. In testing, normally you would start by deleting all docs to initialize a clean state,
		 * then re-index docs and compare with a baseline definition of what docs were indexed. Solr does not support external
		 * calls to re-index (refresh), except at re-start time, so we have to assume our indexing has completed,
		 * and then test against those assumptions.
		 */
		
		/*issue full delete of docs in the index, then reindex and wait until indexed
		String mQueryString = "*:*";
		String mFieldString = "id";
		SolrQuery params = new SolrQuery();
		params.set("q",mQueryString);
		params.set("fl",mFieldString);
		QueryResponse response = solr.query(params);
		System.out.println(response.getResults().toString());
		*/
		
		
		
		
		//TC2.0: query all docs by id, verify count = 11.
		String mQueryString = "*:*";
		String mFieldString = "id";
		SolrQuery params = new SolrQuery();
		params.set("q",mQueryString);
		params.set("fl",mFieldString);
		QueryResponse response = solr.query(params);
		System.out.println(response.getResults().toString());
		
		if(response.getResults().getNumFound() == 11){
			System.out.println("PASS TC2.0: Query '"+mQueryString+"' returned 11 results.");
		}
		else{
			System.out.println("FAIL TC2.0: Query returned "+response.getResults().getNumFound()+" instead of 11 expected results. Full query response follows");
			System.out.println(response.getResults().getNumFound());
		}
		

		//manually-prepared resultDoc id's from test set of docs
		String resultDocs[] = {"id="+baseDir+"Client.doc",
				                "id="+baseDir+"Water and Wastewater.html",
								"id="+baseDir+"fsRecursionTest/allen-p/sent/21.txt",
								"id="+baseDir+"fsRecursionTest/allen-p/sent/23.txt",
								"id="+baseDir+"fsRecursionTest/allen-p/sent/22.txt",
								"id="+baseDir+"fsRecursionTest/allen-p/all_documents/3.txt",
								"id="+baseDir+"fsRecursionTest/allen-p/all_documents/2.txt",
								"id="+baseDir+"fsRecursionTest/allen-p/all_documents/1.txt",
								"id="+baseDir+"311C-2-3_IM_20140730.pdf",
								//"id="+baseDir+"stats.doc",
								"id="+baseDir+"images.jpeg",};
		int i = 0;
		boolean found = true;
		//check that all of the id's (each of which is just a unique path) are contained in the response
		for (String resId : resultDocs){
			if(response.getResults().toString().contains(resId)){
				System.out.println("PASS TC3."+Integer.toString(i)+": doc-id found "+resId);
			}
			else{
				System.out.println("FAIL TC3."+Integer.toString(i)+": doc-id NOT found "+resId);
				found = false;
			}
			i++;
		}
		if(found == false){
			System.out.println("  Failure info: full result set:\n"+response.getResults().toString());
		}

		
	    /* Verify documents types in the index correspond with all possible types in the configuration.
	     * Document types (pdf, doc, jpeg, etc) are parameters of a SOLR configuration, in that our 
	     * configuration is prepared to find, extract, and index these document types. So to verify
	     * our configuration, we need to at least verify the ability to index all of the document
	     * types in our configuration by putting them in the testDoc folder and testing if they
	     * are successfully index or not. In reality, we just tested this in the previous test case
	     * by verifying the full-paths, but its good to factor out test cases, mapping them to specific
	     *  contexts or requirements they wish to target.
	     */
		//verify all required document types are indexed: .doc, .txt, .pdf, .html, jpeg (jpeg optional, but we support it)
		i = 0;
		found = true;
		//verifies that all required document types are contained in the index
		String docTypes[] = {".pdf",".doc",".txt",".html", ".jpeg"};
		for (String docType : docTypes){
			if(response.getResults().toString().contains(docType)){
				System.out.println("PASS TC4."+Integer.toString(i)+": doc-type found "+docType);
			}
			else{
				System.out.println("FAIL TC4."+Integer.toString(i)+": doc-id NOT found "+docType);
				found = false;
			}
			i++;
		}
		if(found == false){
			System.out.println("  Failure info: full result set:\n"+response.getResults().toString());
		}
		

		String docId = baseDir+"Client.doc";
		mQueryString = "id:\""+docId+"\""; //surround with quotes to do exact match on id
		//String mFieldString = "id";
		params = new SolrQuery();
		params.set("q",mQueryString); // query: q=id:/home/jesse/Desktop/SeniorDesign/Testing/TestDocs/Client.doc
		response = solr.query(params);
		if(response.getResults().toString().contains("numFound=1,")){
			if(response.getResults().toString().contains(docId)){
				System.out.println("PASS TC5.0: Query by single id:"+docId);
			}
			else{
				System.out.println("FAIL TC5.0: No result found by single id:"+docId+" full response follows:\n");
  			printFailedResponse(response.getResults().toString());
			}
		}
		else{
			System.out.println("FAIL TC5.0: numFound!=1 for query by single id:"+docId+" full response follows:\n");
			printFailedResponse(response.getResults().toString());
		}
		//System.out.println(response.getHeader().toString()); //header has only qtime info and such

		/* 
      Generic query testing. Verifies all doc types are returned, by querying a pre-made set, 
      and manually verifying the existence of each doc. Note this is really manual testing of
      document types. We do not send the doc-type as a search parameter, we just know beforehand
      that such a document exists and corresponds with the query in our directory of indexed test docs.
    */
		//TC 4.0 Expect Client.doc word doc is returned.
		mQueryString = "text:high-level sequence brute-force server"; //terms unique to the Client.doc document
		params = new SolrQuery();
		params.set("q",mQueryString);
		//params.set("fl",mFieldString);
		response = solr.query(params);
		//check for target doc id in results, and some text w/in the document's body
	    docId = baseDir+"Client.doc";
	    String textStr = "Our brute-force string attack wasn't very systematic";
	    if(response.getResults().toString().contains("id="+docId)){
	      if(response.getResults().toString().contains(textStr)){  
	        System.out.println("PASS TC6.0: Query by for .doc succeeded"+docId);
	      }
		    else{
			    System.out.println("FAIL TC6.0: docId found, but not target text:\""+textStr+"\" results follow:\n");
			    printFailedResponse(response.getResults().toString());
		    }
	    }
	    else{
		    System.out.println("FAIL TC6.0: docId "+docId+" not found, results follow:\n");
		    printFailedResponse(response.getResults().toString());
	    }
	
	  //query a pdf
		//TC 4.1 query a pdf, expect 311C-2-3_IM_20140730.pdf pdf doc is returned.
		mQueryString = "text:\"loss-of-potential logic\"";
		params = new SolrQuery();
		params.set("q",mQueryString); // query: q=id:/home/jesse/Desktop/SeniorDesign/Testing/TestDocs/Client.doc
		//params.set("fl",mFieldString);
		response = solr.query(params); //"text":["We solved this b
		//check for target doc id
	    docId = baseDir+"311C-2-3_IM_20140730.pdf";
	    textStr = "SEL-311C-2, -3 Transmission Protection System Instruction Manual";
	    if(response.getResults().toString().contains("id="+docId)){
	      if(response.getResults().toString().contains(textStr)){  
	        System.out.println("PASS TC6.1: Query by for .pdf succeeded"+docId);
	      }
				else{
					System.out.println("FAIL TC6.1: docId found, but not target text:\""+textStr+"\" results follow:\n");
					printFailedResponse(response.getResults().toString());
				}
	    }
		else{
			System.out.println("FAIL TC6.1: docId "+docId+" not found, results follow:\n");
			printFailedResponse(response.getResults().toString());
		}

		//query an html "doc"
		mQueryString = "text:innovative solutions provide energy utilization asset protection";
		params = new SolrQuery();
		params.set("q",mQueryString); // query: q=id:/home/jesse/Desktop/SeniorDesign/Testing/TestDocs/Client.doc
		response = solr.query(params); //"text":["We solved this b
	    //check for target doc id
	    docId = baseDir+"Water and Wastewater.html";
	    textStr = "Security for Critical Infrastructure";
	    if(response.getResults().toString().contains("id="+docId)){
		    if(response.getResults().toString().contains(textStr)){  
		      System.out.println("PASS TC6.2: Query by for .html succeeded"+docId);
		    }
		    else{
			  System.out.println("FAIL TC6.2: docId found, but not target text:\""+textStr+"\" results follow:\n");
			  printFailedResponse(response.getResults().toString());
		    }
	    }
		else{
			System.out.println("FAIL TC6.2: docId "+docId+" not found, results follow:\n");
			printFailedResponse(response.getResults().toString());
		}
	
	    //query a .txt doc
		mQueryString = "text:\"today in the analyst corner\"";
		params = new SolrQuery();
		params.set("q",mQueryString);
		response = solr.query(params);
	    //check for target doc id
	    docId = baseDir+"fsRecursionTest/allen-p/all_documents/1.txt";
	    textStr = "projected growth and proposed merger with Time Warner";
	    if(response.getResults().toString().contains("id="+docId)){
	    	if(response.getResults().toString().contains(textStr)){  
	    		System.out.println("PASS TC6.3: Query by for .txt succeeded"+docId);
	    	}
	    	else{
				System.out.println("FAIL TC6.3: docId found, but not target text:\""+textStr+"\" results follow:\n");
				System.out.println(response.getResults().toString());
			}
	    }
		else{
			System.out.println("FAIL TC6.3: docId "+docId+" not found, results follow:\n");
			System.out.println(response.getResults().toString());
		}

	    
	    
	    
	    
    /*
      Verify hit-highlighting. Hit highlighting (emphasizing search terms in results) is only an
      added project feature, and likewise the highlighted terms are not very deterministic, given
      the number of highlighting parameters and the length of some documents. So here I verify that
      hit highlighting is working by looking for the existence of <b> and </b> in some 
      result in the result set. This signals that we found some highlighted hits, with the same parameters
      as we sent along. In this case, verification is done by both making sure the correct document
      is returned, and also that it returns a secondary dictionary of highlighted results (since
      highlighted results are returned separately).
  */

		params = new SolrQuery();
		params.addHighlightField("text");      //set highlight field to text (the document body)
		params.setHighlightSimplePre("<b>");   //set emphasis to bold
		params.setHighlightSimplePost("</b>");
		mQueryString = "text:\"today in the analyst corner\""; //query targets a specific document, whose terms we'll verify below
		params.set("q",mQueryString);
		response = solr.query(params);
		//check for target doc id
		docId = baseDir+"fsRecursionTest/allen-p/all_documents/1.txt";  //expected id result
		textStr = "projected growth and proposed merger with Time Warner"; //expected text substring result
		//System.out.println(response.getResults().toString());
		java.util.Map<String, java.util.Map<String,List<String>>> highlights = response.getHighlighting();
		if(highlights == null){
			System.out.println("FAIL TC7: No highlights returned for highlighted query");
		}
		else{
			if(highlights.values().toString().contains("<b>TODAY</b> <b>IN</b> <b>THE</b> <b>ANALYST</b> <b>CORNER</b>")){
				System.out.println("PASS TC7: Highlights correctly returned for highlighted query");				
			}
			else{
				System.out.println("FAIL TC7: Highlights returned, but not as expected for highlighted query. Highlights follow: "+highlights.values().toString());	
			}
		}

		//System.out.println(r.getResponse().toString());
		System.out.println(r.getStatus());
 
		solr.shutdown();        
		System.out.println("DONE. All tests PASS if and only if all PASS down left-hand side.");

	  return;
  }
}
