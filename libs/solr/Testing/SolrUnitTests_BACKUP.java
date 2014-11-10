import java.io.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.apache.solr.client.solrj.*;
import org.apache.solr.client.solrj.impl.HttpSolrServer;
import org.apache.solr.client.solrj.response.QueryResponse;
import org.apache.solr.common.*;



public class solrjTesting {

	static SolrDocumentList solrQuery(SolrServer solr, String query, int rows) throws SolrServerException {
        SolrQuery solrQuery = new SolrQuery(query);
        solrQuery.setRows(rows);
        QueryResponse resp = solr.query(solrQuery);
        SolrDocumentList hits = resp.getResults();
        return hits;
    }
	

    static void printResult(PrintStream out, SolrDocument doc) {
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
	 * Jesse: to run this, cd to ~/Desktop/Search/solr/example and do java -jar start.jar
	 * Then in browser go to http://localhost:8983/solr/#/
	 * 
	 */
	public static void main(String[] args) throws Exception {
		String serverUrl = (args != null && args.length > 0) ? args[0] : "http://localhost:8983/solr/collection1";
		
		SolrServer solr = new HttpSolrServer(serverUrl);
		
		solr.ping();
		
		
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

        
        solr.ping();
        solr.shutdown();
        
		System.out.println("howdy");
	}

}

