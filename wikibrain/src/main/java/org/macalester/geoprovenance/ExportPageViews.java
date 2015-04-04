package org.macalester.geoprovenance;

import org.wikibrain.conf.ConfigurationException;
import org.wikibrain.core.cmd.Env;
import org.wikibrain.core.cmd.EnvBuilder;
import org.wikibrain.core.dao.DaoException;
import org.wikibrain.core.dao.LocalPageDao;
import org.wikibrain.core.lang.Language;
import org.wikibrain.core.model.LocalPage;

/**
 * @author Shilad Sen
 */
public class ExportPageViews {
    public static void main(String args[]) throws ConfigurationException, DaoException {
        Env env = EnvBuilder.envFromArgs(args);
        LocalPageDao dao = env.getConfigurator().get(LocalPageDao.class);
        LocalPage page = dao.getByTitle(Language.EN, "Barack Obama");
        System.out.println("page is " + page);
    }

}
