package com.fasoo.cs_doc.post.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.time.LocalDateTime;

public record PostListQuery(
        // pagination
        @Min(0) Integer page,                 // default 0
        @Min(1) @Max(100) Integer size,       // default 20

        // sort
        SortKey sort,                         // default CREATED_AT
        SortDir dir,                          // default DESC

        // search
        String q,                              // 검색어(옵션)
        SearchField field,                     // 어디서 검색할지(옵션, default TITLE)

        // filtering
        LocalDateTime from,                        // createdAt >= from(옵션)
        LocalDateTime to                           // createdAt <= to(옵션)
) {
    public int pageOrDefault() { return page == null ? 0 : page; }
    public int sizeOrDefault() { return size == null ? 20 : size; }
    public SortKey sortOrDefault() { return sort == null ? SortKey.CREATED_AT : sort; }
    public SortDir dirOrDefault() { return dir == null ? SortDir.DESC : dir; }
    public SearchField fieldOrDefault() { return field == null ? SearchField.TITLE : field; }

    public boolean hasQuery() { return q != null && !q.isBlank(); }

    public enum SortKey { CREATED_AT, UPDATED_AT, TITLE, ID }
    public enum SortDir { ASC, DESC }
    public enum SearchField { TITLE, CONTENT, TITLE_CONTENT }
}
