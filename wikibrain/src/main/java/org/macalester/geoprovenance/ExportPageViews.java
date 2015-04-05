package org.macalester.geoprovenance;

import com.vividsolutions.jts.geom.Geometry;
import gnu.trove.map.TIntIntMap;
import org.joda.time.DateTime;
import org.wikibrain.conf.ConfigurationException;
import org.wikibrain.core.WikiBrainException;
import org.wikibrain.core.cmd.Env;
import org.wikibrain.core.cmd.EnvBuilder;
import org.wikibrain.core.dao.DaoException;
import org.wikibrain.core.dao.LocalPageDao;
import org.wikibrain.core.dao.UniversalPageDao;
import org.wikibrain.core.lang.Language;
import org.wikibrain.core.lang.LocalId;
import org.wikibrain.core.model.LocalPage;
import org.wikibrain.pageview.PageViewDao;
import org.wikibrain.spatial.dao.SpatialDataDao;
import org.wikibrain.spatial.util.ContainmentIndex;
import org.wikibrain.utils.Scoreboard;
import org.wikibrain.utils.WpIOUtils;
import org.wikibrain.wikidata.WikidataDao;
import org.wikibrain.wikidata.WikidataFilter;
import org.wikibrain.wikidata.WikidataStatement;

import java.io.BufferedWriter;
import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

/**
 * @author Shilad Sen
 */
public class ExportPageViews {

    static Map<Integer, String> MISSING_COUNTRY_CODES = new HashMap<Integer, String>();
    static {
        MISSING_COUNTRY_CODES.put(51, "AQ");
//        MISSING_COUNTRY_CODES.put(215664, "AQ");
//        MISSING_COUNTRY_CODES.put(161258, "AQ");
//        MISSING_COUNTRY_CODES.put(1246, "AQ");
//        MISSING_COUNTRY_CODES.put(34754, "AQ");
//        MISSING_COUNTRY_CODES.put(762570, "AQ");
//        MISSING_COUNTRY_CODES.put(628716, "AQ");
//        MISSING_COUNTRY_CODES.put(177477, "AQ");
//        MISSING_COUNTRY_CODES.put(1257783, "AQ");
//        MISSING_COUNTRY_CODES.put(23792, "AQ");
//        MISSING_COUNTRY_CODES.put(133888, "AQ");
//        MISSING_COUNTRY_CODES.put(333946, "AQ");
//        MISSING_COUNTRY_CODES.put(1169008, "AQ");
//        MISSING_COUNTRY_CODES.put(37362, "AQ");
//        MISSING_COUNTRY_CODES.put(172216, "AQ");
//        MISSING_COUNTRY_CODES.put(116970, "AQ");
//        MISSING_COUNTRY_CODES.put(23681, "AQ");
    }

    private static class PageViews {
        final LocalId localId;
        final long views;

        public PageViews(Language lang, int id, long views) {
            this.localId = new LocalId(lang, id);
            this.views = views;
        }
    }


    public static void main(String args[]) throws ConfigurationException, DaoException, WikiBrainException, IOException {
        Env env = EnvBuilder.envFromArgs(args);
        LocalPageDao pageDao = env.getConfigurator().get(LocalPageDao.class);
        PageViewDao viewDao = env.getConfigurator().get(PageViewDao.class);
        WikidataDao wikidataDao = env.getConfigurator().get(WikidataDao.class);

        SpatialDataDao spatialDao = env.getConfigurator().get(SpatialDataDao.class);

        // Get country codes
        Map<Integer, String> countryCodes = new HashMap<Integer, String>(MISSING_COUNTRY_CODES);
        for (WikidataStatement stm : wikidataDao.get(new WikidataFilter.Builder().withPropertyId(297).build())) {
            countryCodes.put(stm.getItem().getId(), stm.getValue().getStringValue());
        }
        System.err.println("found " + countryCodes.size() + " country codes");

        // Index countries
        ContainmentIndex countryIndex = new ContainmentIndex();
        countryIndex.setBufferWidths(new double[] { 0.0 }); // be stingy in buffers
        Map<Integer, Geometry> countries = spatialDao.getAllGeometriesInLayer("country");
        for (int conceptId : countries.keySet()) {
            if (countryCodes.containsKey(conceptId)) {
                countryIndex.insert(conceptId, countries.get(conceptId));
            }else {
                System.err.println("Missing country code for concept " + conceptId);
            }
        }

        // Build leaderboard datastructures for all lang / country pairs.
        Map<String, Scoreboard<PageViews>> top = new HashMap<String, Scoreboard<PageViews>>();
        Map<String, Long> totals = new HashMap<String, Long>();
        for (Language lang : env.getLanguages()) {
            for (String countryCode : countryCodes.values()) {
                String key = lang.getLangCode() + " " + countryCode;
                top.put(key, new Scoreboard<PageViews>(100, Scoreboard.Order.DECREASING));
                totals.put(key, 0l);
            }
        }
        System.err.println("initialized leaderboard for " + top.size() + " entries");

        // Get mapping from universal to local ids in each language.
        Map<Language, TIntIntMap> univToLocal = env
                .getConfigurator().get(UniversalPageDao.class)
                .getAllUnivToLocalIdsMap(env.getLanguages());
        System.err.println("retrieved mapping for " + univToLocal.size() + " languages");

        // For each spatial concept....
        Map<Integer, Geometry> geometries = spatialDao.getAllGeometriesInLayer("wikidata");
        System.err.println("retrieved " + geometries.size() + " geometries");

        int n = 0;
        for (int conceptId : geometries.keySet()) {
            if (++n % 100 == 0) {
                System.err.println("doing " + n + " of " + geometries.size());
            }

            // For each containing country
            for (ContainmentIndex.Result container : countryIndex.getContainer(geometries.get(conceptId))) {
                String countryCode = countryCodes.get(container.id);
                if (countryCode == null) continue;

                // For each language that has an article in the concept
                for (Language lang : env.getLanguages()) {
                    if (univToLocal.containsKey(lang) && univToLocal.get(lang).containsKey(conceptId)) {
                        int localId = univToLocal.get(lang).get(conceptId);
                        int views = viewDao.getNumViews(lang, localId, new DateTime(0), DateTime.now());
                        String key = lang.getLangCode() + " " + countryCode;
                        top.get(key).add(new PageViews(lang, localId, views), views);
                        totals.put(key, totals.get(key) + views);
                    }
                }
            }
        }


        // Output the tops!
        BufferedWriter writer = WpIOUtils.openWriter(new File("lang_country_views.txt"));
        for (String key : top.keySet()) {
            String tokens[] = key.split(" ");
            Language lang = Language.getByLangCode(tokens[0]);
            String countryCode = tokens[1];
            Scoreboard<PageViews> views = top.get(key);
            long topCounts = 0;
            for (int i = 0; i < views.size(); i++) {
                PageViews pv = views.getElement(i);
                LocalPage page = pageDao.getById(pv.localId);
                writer.write(String.format("%s\t%s\t%d\t%s\t%s\n",
                        lang.getLangCode(), countryCode, pv.views,
                        page.getTitle(), page.getTitle().toUrl()));
                topCounts += pv.views;
            }
            long otherCounts = totals.get(key) - topCounts;
            writer.write(String.format("%s\t%s\t%d\t%s\t%s\n",
                    lang.getLangCode(), countryCode, otherCounts,
                    "Other", ""));
        }
        writer.close();
    }

}
