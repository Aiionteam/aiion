package site.aiion.api.soccer.search;

import site.aiion.api.soccer.common.domain.Messenger;

public interface SearchService {
    public Messenger findByWord(String keyword, String type);
}

