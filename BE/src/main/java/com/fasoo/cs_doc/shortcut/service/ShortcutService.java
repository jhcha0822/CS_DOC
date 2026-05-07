package com.fasoo.cs_doc.shortcut.service;

import com.fasoo.cs_doc.member.domain.UserRole;
import com.fasoo.cs_doc.member.repository.MemberRepository;
import com.fasoo.cs_doc.shortcut.domain.ShortcutGroup;
import com.fasoo.cs_doc.shortcut.domain.ShortcutItem;
import com.fasoo.cs_doc.shortcut.dto.ShortcutDtos.*;
import com.fasoo.cs_doc.shortcut.repository.ShortcutGroupRepository;
import com.fasoo.cs_doc.shortcut.repository.ShortcutItemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ShortcutService {

    private final MemberRepository memberRepository;
    private final ShortcutGroupRepository groupRepository;
    private final ShortcutItemRepository itemRepository;

    public ShortcutService(
            MemberRepository memberRepository,
            ShortcutGroupRepository groupRepository,
            ShortcutItemRepository itemRepository
    ) {
        this.memberRepository = memberRepository;
        this.groupRepository = groupRepository;
        this.itemRepository = itemRepository;
    }

    private void requireAdmin(Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        boolean admin = memberRepository.findById(userId)
                .map(m -> m.getRole() == UserRole.ADMIN)
                .orElse(false);
        if (!admin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 조작할 수 있습니다.");
        }
    }

    @Transactional(readOnly = true)
    public List<ShortcutGroupResponse> listPublic() {
        List<ShortcutGroup> groups = groupRepository.findAllByOrderBySortOrderAscIdAsc();
        if (groups.isEmpty()) return List.of();
        Map<Long, List<ShortcutItem>> itemsByGroup = itemRepository.findAll().stream()
                .collect(Collectors.groupingBy(ShortcutItem::getGroupId));
        return groups.stream()
                .map(g -> new ShortcutGroupResponse(
                        g.getId(),
                        g.getName(),
                        g.getSortOrder(),
                        itemsByGroup.getOrDefault(g.getId(), List.of()).stream()
                                .sorted((a, b) -> {
                                    int c = Integer.compare(a.getSortOrder(), b.getSortOrder());
                                    if (c != 0) return c;
                                    return Long.compare(a.getId(), b.getId());
                                })
                                .map(i -> new ShortcutItemResponse(i.getId(), i.getName(), i.getUrl(), i.getSortOrder()))
                                .toList()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ShortcutGroupResponse> listAdmin(Long adminUserId) {
        requireAdmin(adminUserId);
        return listPublic();
    }

    @Transactional
    public ShortcutGroupResponse createGroup(Long adminUserId, ShortcutGroupCreateRequest req) {
        requireAdmin(adminUserId);
        int sort = req.sortOrder() != null ? req.sortOrder() : 0;
        ShortcutGroup saved = groupRepository.save(new ShortcutGroup(req.name(), sort));
        return new ShortcutGroupResponse(saved.getId(), saved.getName(), saved.getSortOrder(), List.of());
    }

    @Transactional
    public ShortcutGroupResponse updateGroup(Long adminUserId, Long groupId, ShortcutGroupUpdateRequest req) {
        requireAdmin(adminUserId);
        ShortcutGroup g = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "그룹을 찾을 수 없습니다: " + groupId));
        g.changeName(req.name());
        if (req.sortOrder() != null) g.changeSortOrder(req.sortOrder());
        ShortcutGroup saved = groupRepository.save(g);
        List<ShortcutItemResponse> items = itemRepository.findByGroupIdOrderBySortOrderAscIdAsc(saved.getId()).stream()
                .map(i -> new ShortcutItemResponse(i.getId(), i.getName(), i.getUrl(), i.getSortOrder()))
                .toList();
        return new ShortcutGroupResponse(saved.getId(), saved.getName(), saved.getSortOrder(), items);
    }

    @Transactional
    public void deleteGroup(Long adminUserId, Long groupId) {
        requireAdmin(adminUserId);
        if (!groupRepository.existsById(groupId)) {
            return;
        }
        itemRepository.deleteByGroupId(groupId);
        groupRepository.deleteById(groupId);
    }

    @Transactional
    public ShortcutItemResponse createItem(Long adminUserId, Long groupId, ShortcutItemCreateRequest req) {
        requireAdmin(adminUserId);
        if (!groupRepository.existsById(groupId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "그룹을 찾을 수 없습니다: " + groupId);
        }
        int sort = req.sortOrder() != null ? req.sortOrder() : 0;
        ShortcutItem saved = itemRepository.save(new ShortcutItem(groupId, req.name(), req.url(), sort));
        return new ShortcutItemResponse(saved.getId(), saved.getName(), saved.getUrl(), saved.getSortOrder());
    }

    @Transactional
    public ShortcutItemResponse updateItem(Long adminUserId, Long itemId, ShortcutItemUpdateRequest req) {
        requireAdmin(adminUserId);
        ShortcutItem i = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "링크를 찾을 수 없습니다: " + itemId));
        i.changeName(req.name());
        i.changeUrl(req.url());
        if (req.sortOrder() != null) i.changeSortOrder(req.sortOrder());
        ShortcutItem saved = itemRepository.save(i);
        return new ShortcutItemResponse(saved.getId(), saved.getName(), saved.getUrl(), saved.getSortOrder());
    }

    @Transactional
    public void deleteItem(Long adminUserId, Long itemId) {
        requireAdmin(adminUserId);
        if (!itemRepository.existsById(itemId)) return;
        itemRepository.deleteById(itemId);
    }
}

