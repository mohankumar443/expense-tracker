package com.example.expensetracker.dto;

import lombok.Data;

@Data
public class SnapshotInfo {
    private String fileName;
    private String displayName;
    private String snapshotDate;
    private boolean isActive;
}
