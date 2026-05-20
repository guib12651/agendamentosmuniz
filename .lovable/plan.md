Implement functional CRM logic for all stages of the Sales Funnel in `SalesFunnel.tsx`.

### UI/UX Refinement (Mobile First)
- Refactor the funnel visualization into high-quality cards with better spacing, shadows, and Muniz branding (Yellow/White/Black).
- Implement smooth transitions and animations for the expanding tabs.
- Ensure total mobile responsiveness with large touch targets.

### Functional Logic by Stage

1.  **Captação (Capture)**
    - Implement editable numeric field for leads captured with a "Save" button.
    - Add fields for Lead Source (Instagram, Meta Ads, Indicação, etc.).
    - Update `sales_funnel_days` table to store source details if needed, or maintain total count.

2.  **Distribuição (Distribution)**
    - Keep current logic but improve the UI for adding/viewing distributed leads per pre-seller.
    - Automatically increment "Distribuição" stage count when leads are assigned.

3.  **Ligações (Calls)**
    - Functional "Registrar Ligação" button.
    - Fields: Lead Name, Pre-seller (auto-filled), Result (Não atendeu, Sem interesse, etc.).
    - List detailed call history with timestamps.

4.  **Agendamentos (Appointments)**
    - Automatically show meetings from the `meetings` table.
    - Detail view showing lead name, time, pre-seller, meeting type, and city.

5.  **Visitas (Visits)**
    - "Confirmar Comparecimento" logic: when marked 'compareceu', lead moves from Appointment view to Visit view.
    - Show details: Consultant, Modalidade, Tipo de crédito.

6.  **Negociações (Negotiations)**
    - "Entrou em negociação" button.
    - Logic: Update meeting status to `em_negociacao`.
    - Show details: Value, status (Em análise, Proposta enviada, etc.).

7.  **Vendas (Sales)**
    - "Venda concluída" button.
    - Logic: Update meeting status to `venda_concluida`.
    - Final conversion tracking.

### Metrics & Filters
- Ensure all calculations respect the active period (Daily, Monthly, etc.).
- Add automatic calculation of:
    - Attendance rate (Comparecimento)
    - Negotiation rate
    - Conversion rate
- Real-time updates via Supabase listeners already in place.

### Technical Steps
1.  **Database**: No schema changes needed (existing tables `sales_funnel_days`, `sales_funnel_distribution`, `meetings`, `calls` cover the requirements).
2.  **Frontend**: Major refactor of `SalesFunnel.tsx` to handle the new fields and UI structure.
3.  **Data Flow**: Enhance `getMeetingsInStage` and `getMeetingsInStageCount` to strictly follow the operational flow (e.g., Visitas = status 'compareceu' AND not in further stages).
