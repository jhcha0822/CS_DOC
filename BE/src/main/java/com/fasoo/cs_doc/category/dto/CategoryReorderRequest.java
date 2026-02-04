package com.fasoo.cs_doc.category.dto;

import java.util.List;

/**
 * 새 순서: orderedIds[i] 의 sortOrder = i
 */
public record CategoryReorderRequest(List<Long> orderedIds) {}
