package com.fasoo.cs_doc.sidebar.service;

import com.fasoo.cs_doc.member.domain.UserRole;
import com.fasoo.cs_doc.member.repository.MemberRepository;
import com.fasoo.cs_doc.sidebar.domain.SidebarMenuSetting;
import com.fasoo.cs_doc.sidebar.dto.SidebarMenuSettingDto;
import com.fasoo.cs_doc.sidebar.dto.SidebarMenuSettingUpdateRequest;
import com.fasoo.cs_doc.sidebar.repository.SidebarMenuSettingRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SidebarMenuSettingService {

    private final MemberRepository memberRepository;
    private final SidebarMenuSettingRepository repository;

    public SidebarMenuSettingService(MemberRepository memberRepository, SidebarMenuSettingRepository repository) {
        this.memberRepository = memberRepository;
        this.repository = repository;
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

    private SidebarMenuSetting getOrCreate() {
        return repository.findById(1L).orElseGet(() -> repository.save(new SidebarMenuSetting()));
    }

    @Transactional(readOnly = true)
    public SidebarMenuSettingDto getPublic() {
        return SidebarMenuSettingDto.from(getOrCreate());
    }

    @Transactional(readOnly = true)
    public SidebarMenuSettingDto getAdmin(Long adminUserId) {
        requireAdmin(adminUserId);
        return SidebarMenuSettingDto.from(getOrCreate());
    }

    @Transactional
    public SidebarMenuSettingDto update(Long adminUserId, SidebarMenuSettingUpdateRequest req) {
        requireAdmin(adminUserId);
        SidebarMenuSetting s = getOrCreate();
        if (req.showMemo() != null) s.setShowMemo(req.showMemo());
        if (req.showAdminSection() != null) s.setShowAdminSection(req.showAdminSection());
        if (req.showPostVersions() != null) s.setShowPostVersions(req.showPostVersions());
        if (req.showUserManage() != null) s.setShowUserManage(req.showUserManage());
        if (req.showAdminShortcuts() != null) s.setShowAdminShortcuts(req.showAdminShortcuts());
        if (req.showAdminContentStats() != null) s.setShowAdminContentStats(req.showAdminContentStats());
        if (req.showAdminAssignmentGrades() != null) s.setShowAdminAssignmentGrades(req.showAdminAssignmentGrades());
        return SidebarMenuSettingDto.from(repository.save(s));
    }
}

