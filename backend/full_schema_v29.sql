--
-- PostgreSQL database dump
--

\restrict NwLWdMOWcoBQTGADyoxagHlDm8R2P5b73rq5iG8sbfApxYK3BSKWaLFu5biCC1a

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: check_ledger_balance(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_ledger_balance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM ledger 
                    WHERE reference_no = NEW.reference_no 
                    AND status = 'Authorized'
                    GROUP BY reference_no 
                    HAVING ABS(SUM(debit) - SUM(credit)) > 0.01
                ) THEN
                    RAISE EXCEPTION 'Ledger Inconsistency Detected: Reference % is unbalanced.', NEW.reference_no;
                END IF;
                RETURN NEW;
            END;
            $$;


ALTER FUNCTION public.check_ledger_balance() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(100) DEFAULT 'فرعي'::character varying,
    balance numeric(15,2) DEFAULT 0.00,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: accounts_chart; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts_chart (
    acc_id integer NOT NULL,
    acc_name character varying(255),
    acc_type character varying(50)
);


ALTER TABLE public.accounts_chart OWNER TO postgres;

--
-- Name: accounts_chart_acc_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accounts_chart_acc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accounts_chart_acc_id_seq OWNER TO postgres;

--
-- Name: accounts_chart_acc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accounts_chart_acc_id_seq OWNED BY public.accounts_chart.acc_id;


--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accounts_id_seq OWNER TO postgres;

--
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- Name: active_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.active_sessions (
    id integer NOT NULL,
    user_id integer,
    token_hash text,
    expires_at timestamp without time zone,
    is_valid boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.active_sessions OWNER TO postgres;

--
-- Name: active_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.active_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.active_sessions_id_seq OWNER TO postgres;

--
-- Name: active_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.active_sessions_id_seq OWNED BY public.active_sessions.id;


--
-- Name: approval_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_history (
    id integer NOT NULL,
    instance_id integer,
    step_number integer NOT NULL,
    approver_id integer,
    action character varying(20),
    comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    approver_username character varying(255)
);


ALTER TABLE public.approval_history OWNER TO postgres;

--
-- Name: approval_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approval_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approval_history_id_seq OWNER TO postgres;

--
-- Name: approval_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approval_history_id_seq OWNED BY public.approval_history.id;


--
-- Name: approval_limits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_limits (
    id integer NOT NULL,
    role character varying(50),
    module character varying(50),
    limit_lcy numeric(15,2),
    currency character varying(10) DEFAULT 'EGP'::character varying,
    level integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    description text
);


ALTER TABLE public.approval_limits OWNER TO postgres;

--
-- Name: approval_limits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approval_limits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approval_limits_id_seq OWNER TO postgres;

--
-- Name: approval_limits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approval_limits_id_seq OWNED BY public.approval_limits.id;


--
-- Name: ar_invoice_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ar_invoice_items (
    id integer NOT NULL,
    invoice_id integer,
    description text,
    quantity numeric(12,2) DEFAULT 1,
    unit_price numeric(15,2),
    total numeric(15,2)
);


ALTER TABLE public.ar_invoice_items OWNER TO postgres;

--
-- Name: ar_invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ar_invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ar_invoice_items_id_seq OWNER TO postgres;

--
-- Name: ar_invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ar_invoice_items_id_seq OWNED BY public.ar_invoice_items.id;


--
-- Name: ar_invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ar_invoices (
    id integer NOT NULL,
    client_name character varying(255) NOT NULL,
    project_name character varying(255),
    date date DEFAULT CURRENT_DATE,
    base_amount numeric(15,2) DEFAULT 0,
    tax_percent numeric(5,2) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    total_amount numeric(15,2) DEFAULT 0,
    status character varying(50) DEFAULT 'Unpaid'::character varying,
    created_by character varying(100),
    qr_code text,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ar_invoices OWNER TO postgres;

--
-- Name: ar_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ar_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ar_invoices_id_seq OWNER TO postgres;

--
-- Name: ar_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ar_invoices_id_seq OWNED BY public.ar_invoices.id;


--
-- Name: asset_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_categories (
    id integer NOT NULL,
    category_name character varying(100),
    depreciation_method character varying(50) DEFAULT 'Straight Line'::character varying,
    useful_life_months integer,
    asset_account_id integer,
    dep_expense_account_id integer,
    accum_dep_account_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.asset_categories OWNER TO postgres;

--
-- Name: asset_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asset_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asset_categories_id_seq OWNER TO postgres;

--
-- Name: asset_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asset_categories_id_seq OWNED BY public.asset_categories.id;


--
-- Name: asset_depreciation_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_depreciation_logs (
    id integer NOT NULL,
    asset_id integer,
    period character varying(20),
    amount numeric(15,2),
    journal_entry_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.asset_depreciation_logs OWNER TO postgres;

--
-- Name: asset_depreciation_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asset_depreciation_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asset_depreciation_logs_id_seq OWNER TO postgres;

--
-- Name: asset_depreciation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asset_depreciation_logs_id_seq OWNED BY public.asset_depreciation_logs.id;


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attachments (
    id integer NOT NULL,
    record_type character varying(100),
    record_id integer,
    file_name character varying(255),
    file_path character varying(500),
    uploaded_by character varying(100),
    upload_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    table_name character varying(255) DEFAULT 'general'::character varying NOT NULL
);


ALTER TABLE public.attachments OWNER TO postgres;

--
-- Name: attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attachments_id_seq OWNER TO postgres;

--
-- Name: attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attachments_id_seq OWNED BY public.attachments.id;


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance (
    att_id integer NOT NULL,
    staff_id integer,
    date date DEFAULT CURRENT_DATE,
    status character varying(20),
    id integer NOT NULL,
    staff_name character varying(255),
    check_in character varying(50),
    check_out character varying(50),
    created_by character varying(100),
    project_name character varying(255)
);


ALTER TABLE public.attendance OWNER TO postgres;

--
-- Name: attendance_att_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_att_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendance_att_id_seq OWNER TO postgres;

--
-- Name: attendance_att_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_att_id_seq OWNED BY public.attendance.att_id;


--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendance_id_seq OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    action_type character varying(50),
    table_name character varying(50),
    record_id character varying(100),
    details text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_log_id_seq OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    username character varying(255),
    action character varying(50),
    table_name character varying(255),
    record_id integer,
    details text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    old_data jsonb,
    new_data jsonb
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: audit_trail; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_trail (
    id integer NOT NULL,
    action character varying(100),
    username character varying(100),
    details text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.audit_trail OWNER TO postgres;

--
-- Name: audit_trail_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_trail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_trail_id_seq OWNER TO postgres;

--
-- Name: audit_trail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_trail_id_seq OWNED BY public.audit_trail.id;


--
-- Name: backups_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.backups_log (
    id integer NOT NULL,
    name character varying(255),
    date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    size character varying(50),
    source character varying(50),
    local_directory character varying(255)
);


ALTER TABLE public.backups_log OWNER TO postgres;

--
-- Name: backups_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.backups_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.backups_log_id_seq OWNER TO postgres;

--
-- Name: backups_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.backups_log_id_seq OWNED BY public.backups_log.id;


--
-- Name: batch_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.batch_jobs (
    id integer NOT NULL,
    job_name character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'QUEUED'::character varying,
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    result_summary text,
    error_log text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.batch_jobs OWNER TO postgres;

--
-- Name: batch_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.batch_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batch_jobs_id_seq OWNER TO postgres;

--
-- Name: batch_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.batch_jobs_id_seq OWNED BY public.batch_jobs.id;


--
-- Name: board_committees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.board_committees (
    id integer NOT NULL,
    company_id integer NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.board_committees OWNER TO postgres;

--
-- Name: board_committees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.board_committees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.board_committees_id_seq OWNER TO postgres;

--
-- Name: board_committees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.board_committees_id_seq OWNED BY public.board_committees.id;


--
-- Name: board_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.board_members (
    id integer NOT NULL,
    company_id integer NOT NULL,
    partner_id integer,
    name character varying(200) NOT NULL,
    member_type character varying(50),
    term_start date,
    term_end date,
    voting_power numeric(10,2) DEFAULT 1.00,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT board_members_member_type_check CHECK (((member_type)::text = ANY (ARRAY[('Executive'::character varying)::text, ('Non-Executive'::character varying)::text, ('Independent'::character varying)::text])))
);


ALTER TABLE public.board_members OWNER TO postgres;

--
-- Name: board_members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.board_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.board_members_id_seq OWNER TO postgres;

--
-- Name: board_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.board_members_id_seq OWNED BY public.board_members.id;


--
-- Name: bom_headers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bom_headers (
    id integer NOT NULL,
    product_name character varying(255) NOT NULL,
    description text,
    standard_cost numeric(15,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bom_headers OWNER TO postgres;

--
-- Name: bom_headers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bom_headers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bom_headers_id_seq OWNER TO postgres;

--
-- Name: bom_headers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bom_headers_id_seq OWNED BY public.bom_headers.id;


--
-- Name: bom_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bom_items (
    id integer NOT NULL,
    bom_id integer,
    item_name character varying(255) NOT NULL,
    required_qty numeric(12,4) NOT NULL,
    waste_factor numeric(5,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bom_items OWNER TO postgres;

--
-- Name: bom_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bom_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bom_items_id_seq OWNER TO postgres;

--
-- Name: bom_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bom_items_id_seq OWNED BY public.bom_items.id;


--
-- Name: boq; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.boq (
    id integer NOT NULL,
    project_name character varying(255),
    item_desc text,
    unit character varying(50),
    est_qty numeric(15,2) DEFAULT 0,
    act_qty numeric(15,2) DEFAULT 0,
    unit_price numeric(15,2) DEFAULT 0,
    created_by character varying(100),
    assigned_qty numeric(15,2) DEFAULT 0
);


ALTER TABLE public.boq OWNER TO postgres;

--
-- Name: boq_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.boq_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.boq_id_seq OWNER TO postgres;

--
-- Name: boq_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.boq_id_seq OWNED BY public.boq.id;


--
-- Name: budgets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budgets (
    id integer NOT NULL,
    account_id integer,
    project_name character varying(255),
    fiscal_year integer,
    budget_amount numeric(15,2),
    alert_threshold_percent integer DEFAULT 90,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.budgets OWNER TO postgres;

--
-- Name: budgets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.budgets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.budgets_id_seq OWNER TO postgres;

--
-- Name: budgets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.budgets_id_seq OWNED BY public.budgets.id;


--
-- Name: chart_of_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chart_of_accounts (
    id integer NOT NULL,
    account_code character varying(50) NOT NULL,
    account_name character varying(255) NOT NULL,
    company_entity character varying(100),
    department character varying(100),
    project_task character varying(100),
    hierarchy_level integer DEFAULT 1,
    parent_account character varying(50),
    account_type character varying(50),
    manual_entry_allowed boolean DEFAULT true,
    reconciliation_flag boolean DEFAULT false,
    currency character varying(10) DEFAULT 'USD'::character varying,
    status character varying(20) DEFAULT 'Active'::character varying,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    balance numeric(15,2) DEFAULT 0,
    company_id integer,
    parent_id integer
);


ALTER TABLE public.chart_of_accounts OWNER TO postgres;

--
-- Name: chart_of_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chart_of_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chart_of_accounts_id_seq OWNER TO postgres;

--
-- Name: chart_of_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chart_of_accounts_id_seq OWNED BY public.chart_of_accounts.id;


--
-- Name: client_consumptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_consumptions (
    id integer NOT NULL,
    client_id integer,
    inventory_id integer,
    consumed_qty numeric,
    paid_amount numeric DEFAULT 0,
    outstanding_balance numeric,
    outstanding_date date,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    total_revenue numeric DEFAULT 0
);


ALTER TABLE public.client_consumptions OWNER TO postgres;

--
-- Name: client_consumptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_consumptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_consumptions_id_seq OWNER TO postgres;

--
-- Name: client_consumptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_consumptions_id_seq OWNED BY public.client_consumptions.id;


--
-- Name: client_delayed_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_delayed_payments (
    id integer NOT NULL,
    client_id integer,
    amount numeric,
    due_date date,
    status character varying(50) DEFAULT 'Pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    inventory_id integer,
    consumed_qty numeric,
    paid_amount numeric DEFAULT 0,
    original_amount numeric,
    last_payment_date date,
    payment_history jsonb DEFAULT '[]'::jsonb,
    remaining_amount numeric DEFAULT 0,
    amount_paid numeric DEFAULT 0,
    consumption_id integer
);


ALTER TABLE public.client_delayed_payments OWNER TO postgres;

--
-- Name: client_delayed_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_delayed_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_delayed_payments_id_seq OWNER TO postgres;

--
-- Name: client_delayed_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_delayed_payments_id_seq OWNED BY public.client_delayed_payments.id;


--
-- Name: client_interactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_interactions (
    id integer NOT NULL,
    client_id integer,
    type character varying(50),
    summary text,
    interaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    next_follow_up date,
    created_by character varying(255)
);


ALTER TABLE public.client_interactions OWNER TO postgres;

--
-- Name: client_interactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_interactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_interactions_id_seq OWNER TO postgres;

--
-- Name: client_interactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_interactions_id_seq OWNED BY public.client_interactions.id;


--
-- Name: client_payment_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_payment_history (
    id integer NOT NULL,
    client_id integer,
    delayed_payment_id integer,
    amount_paid numeric,
    payment_date date DEFAULT CURRENT_DATE,
    payment_method character varying(50),
    reference_no character varying(255),
    notes text
);


ALTER TABLE public.client_payment_history OWNER TO postgres;

--
-- Name: client_payment_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_payment_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_payment_history_id_seq OWNER TO postgres;

--
-- Name: client_payment_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_payment_history_id_seq OWNED BY public.client_payment_history.id;


--
-- Name: client_preorders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_preorders (
    id integer NOT NULL,
    client_id integer NOT NULL,
    po_id integer NOT NULL,
    reserved_qty numeric NOT NULL,
    unit_price numeric NOT NULL,
    advance_payment numeric NOT NULL,
    status character varying(50) DEFAULT 'Pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.client_preorders OWNER TO postgres;

--
-- Name: client_preorders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_preorders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_preorders_id_seq OWNER TO postgres;

--
-- Name: client_preorders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_preorders_id_seq OWNED BY public.client_preorders.id;


--
-- Name: client_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_profiles (
    id integer NOT NULL,
    name character varying(255),
    email character varying(255),
    phone character varying(100),
    address text,
    legal_id character varying(100),
    company_name character varying(255),
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.client_profiles OWNER TO postgres;

--
-- Name: client_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_profiles_id_seq OWNER TO postgres;

--
-- Name: client_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_profiles_id_seq OWNED BY public.client_profiles.id;


--
-- Name: client_refunds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_refunds (
    id integer NOT NULL,
    client_id integer,
    amount numeric,
    date date,
    method character varying(50),
    notes text,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.client_refunds OWNER TO postgres;

--
-- Name: client_refunds_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_refunds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_refunds_id_seq OWNER TO postgres;

--
-- Name: client_refunds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_refunds_id_seq OWNED BY public.client_refunds.id;


--
-- Name: client_stock_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_stock_transactions (
    id integer NOT NULL,
    client_id integer,
    inventory_id integer,
    project_name character varying(255),
    item_name character varying(255),
    qty numeric,
    sell_price numeric,
    total_amount numeric,
    paid_amount numeric DEFAULT 0,
    outstanding_balance numeric DEFAULT 0,
    outstanding_date date,
    transaction_date date,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.client_stock_transactions OWNER TO postgres;

--
-- Name: client_stock_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_stock_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_stock_transactions_id_seq OWNER TO postgres;

--
-- Name: client_stock_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_stock_transactions_id_seq OWNED BY public.client_stock_transactions.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    company character varying(255),
    phone character varying(50),
    email character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_id_seq OWNER TO postgres;

--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: committee_memberships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.committee_memberships (
    committee_id integer NOT NULL,
    member_id integer NOT NULL,
    role character varying(100) DEFAULT 'Member'::character varying
);


ALTER TABLE public.committee_memberships OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name character varying(255),
    base_currency character varying(10) DEFAULT 'EGP'::character varying,
    tax_number character varying(100),
    commercial_reg character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    authorized_capital numeric(20,2) DEFAULT 0,
    issued_capital numeric(20,2) DEFAULT 0,
    legal_form character varying(100)
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: consolidation_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consolidation_runs (
    id integer NOT NULL,
    fiscal_year integer,
    fiscal_month integer,
    entity_id integer,
    status character varying(50),
    run_by character varying(100),
    run_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.consolidation_runs OWNER TO postgres;

--
-- Name: consolidation_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.consolidation_runs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.consolidation_runs_id_seq OWNER TO postgres;

--
-- Name: consolidation_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.consolidation_runs_id_seq OWNED BY public.consolidation_runs.id;


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contracts (
    id integer NOT NULL,
    customer_id integer,
    unit_id integer,
    contract_type character varying(50),
    start_date date,
    end_date date,
    total_value numeric(15,2),
    down_payment numeric(15,2),
    status character varying(50) DEFAULT 'Active'::character varying,
    duration_years numeric,
    payment_frequency character varying(50),
    grace_period_days integer,
    penalty_rate numeric,
    handover_date date,
    sales_rep character varying(255),
    notes text,
    project_name character varying(255),
    project_id integer
);


ALTER TABLE public.contracts OWNER TO postgres;

--
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contracts_id_seq OWNER TO postgres;

--
-- Name: contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contracts_id_seq OWNED BY public.contracts.id;


--
-- Name: crm_interactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.crm_interactions (
    id integer NOT NULL,
    lead_id integer,
    type character varying(50),
    notes text,
    interaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100),
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100)
);


ALTER TABLE public.crm_interactions OWNER TO postgres;

--
-- Name: crm_interactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crm_interactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crm_interactions_id_seq OWNER TO postgres;

--
-- Name: crm_interactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crm_interactions_id_seq OWNED BY public.crm_interactions.id;


--
-- Name: crm_leads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.crm_leads (
    id integer NOT NULL,
    company_name character varying(255),
    contact_person character varying(255),
    email character varying(255),
    phone character varying(50),
    source character varying(100),
    status character varying(50) DEFAULT 'New'::character varying,
    assigned_to character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100)
);


ALTER TABLE public.crm_leads OWNER TO postgres;

--
-- Name: crm_leads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crm_leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crm_leads_id_seq OWNER TO postgres;

--
-- Name: crm_leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crm_leads_id_seq OWNED BY public.crm_leads.id;


--
-- Name: crm_opportunities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.crm_opportunities (
    id integer NOT NULL,
    lead_id integer,
    title character varying(255) NOT NULL,
    expected_value numeric(15,2),
    probability integer,
    stage character varying(50) DEFAULT 'Qualification'::character varying,
    expected_closing_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100),
    CONSTRAINT crm_opportunities_probability_check CHECK (((probability >= 0) AND (probability <= 100)))
);


ALTER TABLE public.crm_opportunities OWNER TO postgres;

--
-- Name: crm_opportunities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crm_opportunities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crm_opportunities_id_seq OWNER TO postgres;

--
-- Name: crm_opportunities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crm_opportunities_id_seq OWNED BY public.crm_opportunities.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(50),
    email character varying(100),
    address text,
    status character varying(50) DEFAULT 'Active'::character varying,
    customer_type character varying(100),
    referral character varying(100),
    customer_since date,
    product character varying(255),
    company_name character varying(255),
    legal_id character varying(100),
    credit_balance numeric DEFAULT 0,
    credit_limit numeric DEFAULT 0,
    vat_number character varying(100),
    industry character varying(100),
    billing_address text,
    shipping_address text,
    contact_person character varying(150),
    contact_role character varying(100),
    payment_terms character varying(100),
    website character varying(255),
    org_unit_id integer,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100)
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: daily_fx_rates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_fx_rates (
    id integer NOT NULL,
    base_currency character varying(10),
    target_currency character varying(10),
    rate numeric(18,6),
    effective_date date DEFAULT CURRENT_DATE,
    source character varying(100) DEFAULT 'System'::character varying
);


ALTER TABLE public.daily_fx_rates OWNER TO postgres;

--
-- Name: daily_fx_rates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_fx_rates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_fx_rates_id_seq OWNER TO postgres;

--
-- Name: daily_fx_rates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_fx_rates_id_seq OWNED BY public.daily_fx_rates.id;


--
-- Name: daily_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_reports (
    id integer NOT NULL,
    project_name character varying(255),
    date date DEFAULT CURRENT_DATE,
    weather character varying(100),
    manpower_count integer DEFAULT 0,
    equipment_used text,
    notes text,
    created_by character varying(100)
);


ALTER TABLE public.daily_reports OWNER TO postgres;

--
-- Name: daily_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_reports_id_seq OWNER TO postgres;

--
-- Name: daily_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_reports_id_seq OWNED BY public.daily_reports.id;


--
-- Name: depreciation_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.depreciation_logs (
    id integer NOT NULL,
    asset_id integer,
    run_date date,
    depreciation_amount numeric(15,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.depreciation_logs OWNER TO postgres;

--
-- Name: depreciation_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.depreciation_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.depreciation_logs_id_seq OWNER TO postgres;

--
-- Name: depreciation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.depreciation_logs_id_seq OWNED BY public.depreciation_logs.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    title character varying(255),
    type character varying(50),
    date date,
    ref character varying(100),
    size character varying(50)
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_logs (
    id integer NOT NULL,
    recipient character varying(255) NOT NULL,
    subject character varying(255),
    body text,
    sent_by character varying(50),
    status character varying(255),
    sent_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    to_email character varying(255)
);


ALTER TABLE public.email_logs OWNER TO postgres;

--
-- Name: email_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_logs_id_seq OWNER TO postgres;

--
-- Name: email_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_logs_id_seq OWNED BY public.email_logs.id;


--
-- Name: email_triggers_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_triggers_config (
    id integer NOT NULL,
    trigger_type character varying(100),
    is_active boolean DEFAULT false
);


ALTER TABLE public.email_triggers_config OWNER TO postgres;

--
-- Name: email_triggers_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_triggers_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_triggers_config_id_seq OWNER TO postgres;

--
-- Name: email_triggers_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_triggers_config_id_seq OWNED BY public.email_triggers_config.id;


--
-- Name: emails_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emails_log (
    id integer NOT NULL,
    sent_at timestamp without time zone,
    recipient character varying(255),
    subject character varying(255),
    body text,
    sent_by character varying(255),
    status character varying(255)
);


ALTER TABLE public.emails_log OWNER TO postgres;

--
-- Name: emails_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emails_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emails_log_id_seq OWNER TO postgres;

--
-- Name: emails_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emails_log_id_seq OWNED BY public.emails_log.id;


--
-- Name: employee_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_documents (
    id integer NOT NULL,
    staff_id integer,
    doc_type character varying(100),
    doc_path text NOT NULL,
    expiry_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.employee_documents OWNER TO postgres;

--
-- Name: employee_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employee_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employee_documents_id_seq OWNER TO postgres;

--
-- Name: employee_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employee_documents_id_seq OWNED BY public.employee_documents.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    emp_id integer NOT NULL,
    name character varying(255),
    "position" character varying(100),
    salary numeric(15,2),
    join_date date DEFAULT CURRENT_DATE,
    hiring_date text,
    status text DEFAULT 'Active'::text
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: employees_emp_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employees_emp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employees_emp_id_seq OWNER TO postgres;

--
-- Name: employees_emp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employees_emp_id_seq OWNED BY public.employees.emp_id;


--
-- Name: eoy_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.eoy_logs (
    id integer NOT NULL,
    year integer NOT NULL,
    total_revenue numeric(15,2),
    total_expense numeric(15,2),
    net_profit numeric(15,2),
    executed_by character varying(100),
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.eoy_logs OWNER TO postgres;

--
-- Name: eoy_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.eoy_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.eoy_logs_id_seq OWNER TO postgres;

--
-- Name: eoy_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.eoy_logs_id_seq OWNED BY public.eoy_logs.id;


--
-- Name: equity_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equity_history (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    company_id integer NOT NULL,
    transaction_type character varying(50) NOT NULL,
    prev_percentage numeric(8,4),
    new_percentage numeric(8,4),
    effective_date date DEFAULT CURRENT_DATE,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.equity_history OWNER TO postgres;

--
-- Name: equity_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.equity_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.equity_history_id_seq OWNER TO postgres;

--
-- Name: equity_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.equity_history_id_seq OWNED BY public.equity_history.id;


--
-- Name: erp_countries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.erp_countries (
    erp_id character varying(50) NOT NULL,
    country_code character varying(10) NOT NULL
);


ALTER TABLE public.erp_countries OWNER TO postgres;

--
-- Name: erp_inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.erp_inventory (
    item_id integer NOT NULL,
    item_name character varying(255),
    qty_on_hand numeric(15,3) DEFAULT 0,
    unit_price numeric(15,2)
);


ALTER TABLE public.erp_inventory OWNER TO postgres;

--
-- Name: erp_inventory_item_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.erp_inventory_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.erp_inventory_item_id_seq OWNER TO postgres;

--
-- Name: erp_inventory_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.erp_inventory_item_id_seq OWNED BY public.erp_inventory.item_id;


--
-- Name: erp_projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.erp_projects (
    project_id integer NOT NULL,
    name character varying(255),
    budget numeric(15,2)
);


ALTER TABLE public.erp_projects OWNER TO postgres;

--
-- Name: erp_projects_project_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.erp_projects_project_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.erp_projects_project_id_seq OWNER TO postgres;

--
-- Name: erp_projects_project_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.erp_projects_project_id_seq OWNED BY public.erp_projects.project_id;


--
-- Name: erp_providers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.erp_providers (
    id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    website_url text,
    price_value numeric(10,2),
    price_text text,
    mobile_support text,
    notes text,
    country_notes text
);


ALTER TABLE public.erp_providers OWNER TO postgres;

--
-- Name: erp_sizes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.erp_sizes (
    erp_id character varying(50) NOT NULL,
    company_size character varying(20) NOT NULL
);


ALTER TABLE public.erp_sizes OWNER TO postgres;

--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exchange_rates (
    id integer NOT NULL,
    base_currency character varying(10) DEFAULT 'USD'::character varying,
    target_currency character varying(10) NOT NULL,
    rate numeric(15,6) NOT NULL,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.exchange_rates OWNER TO postgres;

--
-- Name: exchange_rates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exchange_rates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exchange_rates_id_seq OWNER TO postgres;

--
-- Name: exchange_rates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exchange_rates_id_seq OWNED BY public.exchange_rates.id;


--
-- Name: field_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.field_permissions (
    id integer NOT NULL,
    role_name character varying(50),
    table_name character varying(100),
    field_name character varying(100),
    can_view boolean DEFAULT true,
    can_edit boolean DEFAULT true,
    mask_data boolean DEFAULT false
);


ALTER TABLE public.field_permissions OWNER TO postgres;

--
-- Name: field_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.field_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.field_permissions_id_seq OWNER TO postgres;

--
-- Name: field_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.field_permissions_id_seq OWNED BY public.field_permissions.id;


--
-- Name: financial_discrepancies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.financial_discrepancies (
    id integer NOT NULL,
    type character varying(50),
    details text,
    severity character varying(20),
    is_resolved boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.financial_discrepancies OWNER TO postgres;

--
-- Name: financial_discrepancies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.financial_discrepancies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.financial_discrepancies_id_seq OWNER TO postgres;

--
-- Name: financial_discrepancies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.financial_discrepancies_id_seq OWNED BY public.financial_discrepancies.id;


--
-- Name: financial_periods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.financial_periods (
    id integer NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    is_closed boolean DEFAULT false,
    closed_by character varying(100),
    closed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.financial_periods OWNER TO postgres;

--
-- Name: financial_periods_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.financial_periods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.financial_periods_id_seq OWNER TO postgres;

--
-- Name: financial_periods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.financial_periods_id_seq OWNED BY public.financial_periods.id;


--
-- Name: fiscal_periods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fiscal_periods (
    id integer NOT NULL,
    period_name character varying(50),
    start_date date,
    end_date date,
    status character varying(20) DEFAULT 'Open'::character varying,
    closed_at timestamp without time zone,
    closed_by character varying(100)
);


ALTER TABLE public.fiscal_periods OWNER TO postgres;

--
-- Name: fiscal_periods_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fiscal_periods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fiscal_periods_id_seq OWNER TO postgres;

--
-- Name: fiscal_periods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fiscal_periods_id_seq OWNED BY public.fiscal_periods.id;


--
-- Name: fixed_assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fixed_assets (
    id integer NOT NULL,
    asset_name character varying(255) NOT NULL,
    asset_category character varying(100),
    purchase_price numeric(15,2) DEFAULT 0,
    salvage_value numeric(15,2) DEFAULT 0,
    useful_life_months integer DEFAULT 60,
    purchase_date date,
    accumulated_depreciation numeric(15,2) DEFAULT 0,
    last_depreciation_date date,
    status character varying(50) DEFAULT 'Active'::character varying,
    current_book_value numeric(15,2) DEFAULT 0
);


ALTER TABLE public.fixed_assets OWNER TO postgres;

--
-- Name: fixed_assets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fixed_assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fixed_assets_id_seq OWNER TO postgres;

--
-- Name: fixed_assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fixed_assets_id_seq OWNED BY public.fixed_assets.id;


--
-- Name: fx_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fx_history (
    id integer NOT NULL,
    currency character varying(10),
    rate_to_lcy numeric(15,6),
    date date DEFAULT CURRENT_DATE
);


ALTER TABLE public.fx_history OWNER TO postgres;

--
-- Name: fx_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fx_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fx_history_id_seq OWNER TO postgres;

--
-- Name: fx_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fx_history_id_seq OWNED BY public.fx_history.id;


--
-- Name: fx_rates_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fx_rates_history (
    id integer NOT NULL,
    currency_code character varying(10),
    rate numeric(15,6),
    effective_date date DEFAULT CURRENT_DATE,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.fx_rates_history OWNER TO postgres;

--
-- Name: fx_rates_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fx_rates_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fx_rates_history_id_seq OWNER TO postgres;

--
-- Name: fx_rates_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fx_rates_history_id_seq OWNED BY public.fx_rates_history.id;


--
-- Name: gl_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gl_mappings (
    id integer NOT NULL,
    transaction_type character varying(255),
    debit_account character varying(255),
    credit_account character varying(255),
    cost_center_required boolean DEFAULT true
);


ALTER TABLE public.gl_mappings OWNER TO postgres;

--
-- Name: gl_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gl_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gl_mappings_id_seq OWNER TO postgres;

--
-- Name: gl_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gl_mappings_id_seq OWNED BY public.gl_mappings.id;


--
-- Name: goods_receipt_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goods_receipt_notes (
    id integer NOT NULL,
    po_id integer,
    grn_date date,
    material_name character varying(255),
    qty_received numeric DEFAULT 0,
    unit_price numeric DEFAULT 0,
    supplier character varying(255),
    warehouse_name character varying(255),
    batch_number character varying(100),
    expiry_date date,
    received_by character varying(255),
    status character varying(50) DEFAULT 'Received'::character varying
);


ALTER TABLE public.goods_receipt_notes OWNER TO postgres;

--
-- Name: goods_receipt_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goods_receipt_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.goods_receipt_notes_id_seq OWNER TO postgres;

--
-- Name: goods_receipt_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.goods_receipt_notes_id_seq OWNED BY public.goods_receipt_notes.id;


--
-- Name: grn; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grn (
    id integer NOT NULL,
    po_id integer NOT NULL,
    receipt_date date NOT NULL,
    received_qty numeric(10,2) NOT NULL,
    batch_number character varying(100) DEFAULT 'N/A'::character varying,
    expiry_date date,
    carton_dimensions character varying(100),
    warehouse character varying(255) NOT NULL,
    created_by character varying(100),
    project_name character varying(255)
);


ALTER TABLE public.grn OWNER TO postgres;

--
-- Name: grn_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grn_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grn_id_seq OWNER TO postgres;

--
-- Name: grn_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grn_id_seq OWNED BY public.grn.id;


--
-- Name: installments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.installments (
    id integer NOT NULL,
    contract_id integer,
    due_date date,
    amount numeric(15,2),
    status character varying(50) DEFAULT 'Pending'::character varying,
    installment_no character varying(100),
    unit_number character varying(100),
    paid_amount numeric DEFAULT 0,
    penalty_rate numeric DEFAULT 0.05
);


ALTER TABLE public.installments OWNER TO postgres;

--
-- Name: installments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.installments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.installments_id_seq OWNER TO postgres;

--
-- Name: installments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.installments_id_seq OWNED BY public.installments.id;


--
-- Name: intercompany_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.intercompany_mappings (
    id integer NOT NULL,
    account_code character varying(50),
    entity_id integer,
    elimination_target_code character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.intercompany_mappings OWNER TO postgres;

--
-- Name: intercompany_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.intercompany_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.intercompany_mappings_id_seq OWNER TO postgres;

--
-- Name: intercompany_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.intercompany_mappings_id_seq OWNED BY public.intercompany_mappings.id;


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory (
    id integer CONSTRAINT inventory_id_not_null1 NOT NULL,
    item_name character varying(255),
    qty numeric DEFAULT 0,
    unit_cost numeric DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    batch_no character varying(100),
    warehouse character varying(100) DEFAULT 'Main Store'::character varying,
    po_id integer,
    uom character varying(50)
);


ALTER TABLE public.inventory OWNER TO postgres;

--
-- Name: inventory_bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_bookings (
    id integer NOT NULL,
    inventory_id integer,
    customer_name character varying(255),
    project_name character varying(255),
    qty numeric(12,2),
    sell_price numeric(12,2),
    deposit_amount numeric(12,2) DEFAULT 0,
    remaining_amount numeric(12,2) DEFAULT 0,
    status character varying(50) DEFAULT 'Pending'::character varying,
    booking_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100),
    payment_method character varying(50) DEFAULT 'Cash'::character varying,
    reference_no character varying(100),
    client_id integer,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100),
    month integer,
    year integer
);


ALTER TABLE public.inventory_bookings OWNER TO postgres;

--
-- Name: inventory_bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_bookings_id_seq OWNER TO postgres;

--
-- Name: inventory_bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_bookings_id_seq OWNED BY public.inventory_bookings.id;


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_items (
    id integer CONSTRAINT inventory_id_not_null NOT NULL,
    item_code character varying(50),
    item_name character varying(255) CONSTRAINT inventory_item_name_not_null NOT NULL,
    unit character varying(50) DEFAULT 'قطعة'::character varying,
    quantity numeric(15,2) DEFAULT 0.00,
    remaining_qty numeric(15,2) DEFAULT 0.00,
    unit_cost numeric(15,2) DEFAULT 0.00,
    po_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    name character varying(255),
    project_name character varying(255),
    buy_price numeric(15,2) DEFAULT 0,
    buy_date date DEFAULT CURRENT_DATE,
    avg_cost numeric(15,2) DEFAULT 0,
    barcode character varying(100),
    batch_number character varying(100),
    expiry_date date,
    location_bin character varying(100),
    min_stock_level numeric DEFAULT 0,
    weight numeric DEFAULT 0,
    reserved_qty numeric(15,2) DEFAULT 0,
    company_id integer,
    master_po_no character varying(100),
    item_description text,
    warehouse character varying(255) DEFAULT 'المخزن الرئيسي'::character varying,
    uom character varying(50) DEFAULT 'Unit'::character varying,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100),
    status character varying(50) DEFAULT 'Active'::character varying,
    warehouse_id integer
);


ALTER TABLE public.inventory_items OWNER TO postgres;

--
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_id_seq OWNER TO postgres;

--
-- Name: inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_id_seq OWNED BY public.inventory_items.id;


--
-- Name: inventory_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_id_seq1 OWNER TO postgres;

--
-- Name: inventory_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_id_seq1 OWNED BY public.inventory.id;


--
-- Name: inventory_reservations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_reservations (
    id integer NOT NULL,
    client_name character varying(255) NOT NULL,
    product_name character varying(255) NOT NULL,
    reserved_qty numeric DEFAULT 0 NOT NULL,
    advance_payment numeric DEFAULT 0 NOT NULL,
    expected_arrival_date date,
    status character varying(50) DEFAULT 'Pending'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.inventory_reservations OWNER TO postgres;

--
-- Name: inventory_reservations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_reservations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_reservations_id_seq OWNER TO postgres;

--
-- Name: inventory_reservations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_reservations_id_seq OWNED BY public.inventory_reservations.id;


--
-- Name: inventory_sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_sales (
    id integer NOT NULL,
    inventory_id integer,
    date date,
    customer_name character varying(255),
    project_name character varying(255),
    item_name character varying(255),
    qty numeric,
    buy_price numeric,
    sell_price numeric,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_posted boolean DEFAULT false,
    commission_rate numeric(15,2) DEFAULT 0,
    commission_amount numeric(15,2) DEFAULT 0,
    salesperson_id integer,
    company_id integer,
    payment_method character varying(50) DEFAULT 'Cash'::character varying,
    reference_no character varying(100),
    client_id integer,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100),
    month integer,
    year integer
);


ALTER TABLE public.inventory_sales OWNER TO postgres;

--
-- Name: inventory_sales_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_sales_id_seq OWNER TO postgres;

--
-- Name: inventory_sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_sales_id_seq OWNED BY public.inventory_sales.id;


--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_transactions (
    id integer NOT NULL,
    inventory_id integer,
    transaction_type character varying(50),
    quantity numeric(15,2),
    unit_price numeric(15,2),
    balance_after numeric(15,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reference_id character varying(100),
    advanced_payment numeric(15,2) DEFAULT 0,
    agreed_price numeric(15,2) DEFAULT 0,
    created_by character varying(100)
);


ALTER TABLE public.inventory_transactions OWNER TO postgres;

--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_transactions_id_seq OWNER TO postgres;

--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_transactions_id_seq OWNED BY public.inventory_transactions.id;


--
-- Name: inventory_transfers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_transfers (
    id integer NOT NULL,
    material character varying(255),
    qty numeric(15,2) DEFAULT 0,
    from_project character varying(255),
    to_project character varying(255),
    date date DEFAULT CURRENT_DATE,
    created_by character varying(100),
    status character varying(50) DEFAULT 'In Transit'::character varying,
    shipping_manifest character varying(100),
    batch_number character varying(100),
    expected_arrival date
);


ALTER TABLE public.inventory_transfers OWNER TO postgres;

--
-- Name: inventory_transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_transfers_id_seq OWNER TO postgres;

--
-- Name: inventory_transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_transfers_id_seq OWNED BY public.inventory_transfers.id;


--
-- Name: inventory_usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_usage (
    usage_id integer NOT NULL,
    project_id integer,
    inv_item_id integer,
    quantity_used numeric(15,2) DEFAULT 0,
    usage_date date DEFAULT CURRENT_DATE,
    note text,
    linked_expense_id integer
);


ALTER TABLE public.inventory_usage OWNER TO postgres;

--
-- Name: inventory_usage_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_usage_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_usage_usage_id_seq OWNER TO postgres;

--
-- Name: inventory_usage_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_usage_usage_id_seq OWNED BY public.inventory_usage.usage_id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    client_id integer,
    project_id integer,
    amount numeric(15,2) DEFAULT 0.00,
    status character varying(50) DEFAULT 'مسودة'::character varying,
    issue_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    company_id integer
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journal_entries (
    id integer NOT NULL,
    debit_account_id integer,
    credit_account_id integer,
    amount numeric(15,2) NOT NULL,
    project_id integer,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100),
    status character varying(50) DEFAULT 'Active'::character varying
);


ALTER TABLE public.journal_entries OWNER TO postgres;

--
-- Name: journal_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.journal_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.journal_entries_id_seq OWNER TO postgres;

--
-- Name: journal_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.journal_entries_id_seq OWNED BY public.journal_entries.id;


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_requests (
    id integer NOT NULL,
    staff_id integer,
    leave_type character varying(50),
    start_date date,
    end_date date,
    status character varying(50) DEFAULT 'Pending'::character varying,
    manager_comments text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100)
);


ALTER TABLE public.leave_requests OWNER TO postgres;

--
-- Name: leave_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leave_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leave_requests_id_seq OWNER TO postgres;

--
-- Name: leave_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leave_requests_id_seq OWNED BY public.leave_requests.id;


--
-- Name: leaves; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leaves (
    id integer NOT NULL,
    staff_id integer,
    staff_name character varying(255),
    leave_type character varying(100),
    start_date date,
    end_date date,
    status character varying(50) DEFAULT 'Pending'::character varying,
    created_by character varying(100)
);


ALTER TABLE public.leaves OWNER TO postgres;

--
-- Name: leaves_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leaves_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leaves_id_seq OWNER TO postgres;

--
-- Name: leaves_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leaves_id_seq OWNED BY public.leaves.id;


--
-- Name: ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger (
    id integer CONSTRAINT ledger_new_id_not_null NOT NULL,
    voucher_no character varying(100),
    company_id integer,
    account_id integer,
    account_name character varying(255),
    cost_center_id integer,
    debit numeric DEFAULT 0,
    credit numeric DEFAULT 0,
    description text,
    reference_no character varying(100),
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    cost_center character varying(255),
    client_id integer,
    source_module character varying(50),
    org_unit_id integer,
    status character varying(50) DEFAULT 'Authorized'::character varying,
    is_reversed boolean DEFAULT false,
    reversal_id integer
);


ALTER TABLE public.ledger OWNER TO postgres;

--
-- Name: ledger_new_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ledger_new_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ledger_new_id_seq OWNER TO postgres;

--
-- Name: ledger_new_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ledger_new_id_seq OWNED BY public.ledger.id;


--
-- Name: legal_entities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.legal_entities (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    tax_id character varying(100),
    base_currency character varying(10) DEFAULT 'EGP'::character varying,
    is_holding boolean DEFAULT false,
    parent_id integer,
    metadata jsonb,
    status character varying(20) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.legal_entities OWNER TO postgres;

--
-- Name: legal_entities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.legal_entities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.legal_entities_id_seq OWNER TO postgres;

--
-- Name: legal_entities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.legal_entities_id_seq OWNED BY public.legal_entities.id;


--
-- Name: material_usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material_usage (
    id integer NOT NULL,
    project_name character varying(255),
    material character varying(255),
    qty numeric DEFAULT 0,
    requested_by character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    est_cost numeric(15,2) DEFAULT 0
);


ALTER TABLE public.material_usage OWNER TO postgres;

--
-- Name: material_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.material_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.material_usage_id_seq OWNER TO postgres;

--
-- Name: material_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.material_usage_id_seq OWNED BY public.material_usage.id;


--
-- Name: metadata_entities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metadata_entities (
    id integer NOT NULL,
    entity_key character varying(100) NOT NULL,
    display_name_ar character varying(255),
    table_name character varying(100) NOT NULL
);


ALTER TABLE public.metadata_entities OWNER TO postgres;

--
-- Name: metadata_entities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.metadata_entities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.metadata_entities_id_seq OWNER TO postgres;

--
-- Name: metadata_entities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.metadata_entities_id_seq OWNED BY public.metadata_entities.id;


--
-- Name: metadata_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metadata_fields (
    id integer NOT NULL,
    entity_id integer,
    field_key character varying(100) NOT NULL,
    field_type character varying(50) NOT NULL,
    display_name_ar character varying(255),
    display_order integer
);


ALTER TABLE public.metadata_fields OWNER TO postgres;

--
-- Name: metadata_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.metadata_fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.metadata_fields_id_seq OWNER TO postgres;

--
-- Name: metadata_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.metadata_fields_id_seq OWNED BY public.metadata_fields.id;


--
-- Name: new_module; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.new_module (
    id integer NOT NULL,
    field1 character varying(255) NOT NULL,
    field2 character varying(255),
    project_name character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.new_module OWNER TO postgres;

--
-- Name: new_module_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.new_module_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.new_module_id_seq OWNER TO postgres;

--
-- Name: new_module_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.new_module_id_seq OWNED BY public.new_module.id;


--
-- Name: notification_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_subscriptions (
    id integer NOT NULL,
    user_id integer,
    event_type character varying(50) NOT NULL,
    channels jsonb DEFAULT '["in-app"]'::jsonb
);


ALTER TABLE public.notification_subscriptions OWNER TO postgres;

--
-- Name: notification_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_subscriptions_id_seq OWNER TO postgres;

--
-- Name: notification_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_subscriptions_id_seq OWNED BY public.notification_subscriptions.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    title character varying(100) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: org_units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.org_units (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50),
    type character varying(50),
    parent_id integer,
    tenant_id character varying(100),
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.org_units OWNER TO postgres;

--
-- Name: org_units_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.org_units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.org_units_id_seq OWNER TO postgres;

--
-- Name: org_units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.org_units_id_seq OWNED BY public.org_units.id;


--
-- Name: organization_units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organization_units (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    parent_id integer,
    unit_type character varying(50) NOT NULL,
    company_id integer,
    base_currency character varying(10) DEFAULT 'EGP'::character varying
);


ALTER TABLE public.organization_units OWNER TO postgres;

--
-- Name: organization_units_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.organization_units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organization_units_id_seq OWNER TO postgres;

--
-- Name: organization_units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.organization_units_id_seq OWNED BY public.organization_units.id;


--
-- Name: outstanding_dues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.outstanding_dues (
    id integer NOT NULL,
    settlement_id integer,
    due_amount numeric,
    due_date date
);


ALTER TABLE public.outstanding_dues OWNER TO postgres;

--
-- Name: outstanding_dues_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.outstanding_dues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.outstanding_dues_id_seq OWNER TO postgres;

--
-- Name: outstanding_dues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.outstanding_dues_id_seq OWNED BY public.outstanding_dues.id;


--
-- Name: outstanding_settlements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.outstanding_settlements (
    id integer NOT NULL,
    transaction_amount numeric,
    paid_amount numeric,
    payment_date date,
    total_outstanding_balance numeric,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.outstanding_settlements OWNER TO postgres;

--
-- Name: outstanding_settlements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.outstanding_settlements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.outstanding_settlements_id_seq OWNER TO postgres;

--
-- Name: outstanding_settlements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.outstanding_settlements_id_seq OWNED BY public.outstanding_settlements.id;


--
-- Name: partner_deposits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partner_deposits (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    amount numeric(15,2) DEFAULT 0,
    description character varying(255),
    created_by character varying(100),
    amount_fcy numeric DEFAULT 0,
    fx_rate numeric DEFAULT 1,
    fcy_amount numeric(15,2) DEFAULT 0,
    currency character varying(10) DEFAULT 'EGP'::character varying,
    payment_method character varying(50),
    reference_no character varying(100)
);


ALTER TABLE public.partner_deposits OWNER TO postgres;

--
-- Name: partner_deposits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.partner_deposits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partner_deposits_id_seq OWNER TO postgres;

--
-- Name: partner_deposits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.partner_deposits_id_seq OWNED BY public.partner_deposits.id;


--
-- Name: partner_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partner_documents (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    doc_type character varying(100) NOT NULL,
    file_url text NOT NULL,
    issue_date date,
    expiry_date date,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.partner_documents OWNER TO postgres;

--
-- Name: partner_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.partner_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partner_documents_id_seq OWNER TO postgres;

--
-- Name: partner_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.partner_documents_id_seq OWNED BY public.partner_documents.id;


--
-- Name: partner_financial_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partner_financial_log (
    id integer NOT NULL,
    project_id integer NOT NULL,
    partner_id integer NOT NULL,
    changed_at timestamp with time zone DEFAULT now(),
    loan_amount numeric(15,2),
    share_percentage numeric(5,2),
    changed_by character varying(120) DEFAULT 'system'::character varying NOT NULL,
    change_type character varying(20) DEFAULT 'update'::character varying NOT NULL,
    note text
);


ALTER TABLE public.partner_financial_log OWNER TO postgres;

--
-- Name: partner_financial_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.partner_financial_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partner_financial_log_id_seq OWNER TO postgres;

--
-- Name: partner_financial_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.partner_financial_log_id_seq OWNED BY public.partner_financial_log.id;


--
-- Name: partner_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partner_history (
    id integer NOT NULL,
    project_id integer,
    partner_id integer,
    change_type character varying(50),
    old_val jsonb,
    new_val jsonb,
    changed_by character varying(100),
    changed_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.partner_history OWNER TO postgres;

--
-- Name: partner_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.partner_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partner_history_id_seq OWNER TO postgres;

--
-- Name: partner_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.partner_history_id_seq OWNED BY public.partner_history.id;


--
-- Name: partner_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partner_transactions (
    id integer NOT NULL,
    partner_id integer,
    type character varying(100),
    amount numeric DEFAULT 0,
    date date,
    description text,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fcy_amount numeric(15,2) DEFAULT 0,
    currency character varying(10) DEFAULT 'EGP'::character varying,
    fx_rate numeric(10,4) DEFAULT 1,
    payment_method character varying(50),
    reference_no character varying(100),
    project_name character varying(200) DEFAULT 'General'::character varying,
    company character varying(255),
    exchange_rate numeric(12,4) DEFAULT 1,
    amount_fc numeric(15,2) DEFAULT 0
);


ALTER TABLE public.partner_transactions OWNER TO postgres;

--
-- Name: partner_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.partner_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partner_transactions_id_seq OWNER TO postgres;

--
-- Name: partner_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.partner_transactions_id_seq OWNED BY public.partner_transactions.id;


--
-- Name: partner_withdrawals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partner_withdrawals (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    amount numeric(15,2) DEFAULT 0,
    description character varying(255),
    created_by character varying(100),
    amount_fcy numeric DEFAULT 0,
    fx_rate numeric DEFAULT 1,
    fcy_amount numeric(15,2) DEFAULT 0,
    currency character varying(10) DEFAULT 'EGP'::character varying,
    payment_method character varying(50),
    reference_no character varying(100)
);


ALTER TABLE public.partner_withdrawals OWNER TO postgres;

--
-- Name: partner_withdrawals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.partner_withdrawals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partner_withdrawals_id_seq OWNER TO postgres;

--
-- Name: partner_withdrawals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.partner_withdrawals_id_seq OWNED BY public.partner_withdrawals.id;


--
-- Name: partners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partners (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(100),
    investment_percentage numeric DEFAULT 0,
    management_percentage numeric DEFAULT 0,
    total_capital numeric DEFAULT 0,
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    project_name character varying(255),
    share_percent numeric(5,2) DEFAULT 0,
    investment_fcy numeric(15,2) DEFAULT 0,
    currency character varying(10) DEFAULT 'EGP'::character varying,
    fx_rate numeric(10,4) DEFAULT 1,
    is_management boolean DEFAULT false,
    equity_percentage numeric(5,2) DEFAULT 0,
    management_rate numeric(5,2) DEFAULT 0,
    company_id integer,
    base_currency character varying(10) DEFAULT 'EGP'::character varying,
    partner_category character varying(50) DEFAULT 'Individual'::character varying,
    authorized_shares numeric(20,2) DEFAULT 0,
    identity_number character varying(100),
    partner_type character varying(50) DEFAULT 'Partner'::character varying,
    company character varying(255),
    expected_profit_rate numeric DEFAULT 0,
    investment_amount numeric DEFAULT 0,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100)
);


ALTER TABLE public.partners OWNER TO postgres;

--
-- Name: partners_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.partners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partners_id_seq OWNER TO postgres;

--
-- Name: partners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.partners_id_seq OWNED BY public.partners.id;


--
-- Name: payment_allocations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_allocations (
    id integer NOT NULL,
    payment_id integer,
    debt_id integer,
    allocated_amount numeric(15,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payment_allocations OWNER TO postgres;

--
-- Name: payment_allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_allocations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_allocations_id_seq OWNER TO postgres;

--
-- Name: payment_allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_allocations_id_seq OWNED BY public.payment_allocations.id;


--
-- Name: payment_receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_receipts (
    id integer NOT NULL,
    installment_id integer,
    receipt_date date,
    amount numeric(15,2),
    payment_method character varying(50),
    reference_no character varying(100),
    created_by character varying(100),
    installment_no character varying(100),
    unit_number character varying(100),
    outstanding_amount numeric DEFAULT 0
);


ALTER TABLE public.payment_receipts OWNER TO postgres;

--
-- Name: payment_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_receipts_id_seq OWNER TO postgres;

--
-- Name: payment_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_receipts_id_seq OWNED BY public.payment_receipts.id;


--
-- Name: payroll; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payroll (
    id integer NOT NULL,
    staff_id integer,
    staff_name character varying(255),
    month character varying(100),
    basic_salary numeric(15,2),
    allowances numeric(15,2),
    deductions numeric(15,2),
    net_salary numeric(15,2),
    execution_date date DEFAULT CURRENT_DATE,
    project_name character varying(255),
    incentives numeric(15,2) DEFAULT 0,
    commissions numeric(15,2) DEFAULT 0,
    expenses numeric(15,2) DEFAULT 0,
    profit_share numeric(15,2) DEFAULT 0,
    advance_deduction numeric(15,2) DEFAULT 0,
    amount numeric(15,2) DEFAULT 0,
    period character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tax_deduction numeric DEFAULT 0,
    insurance_deduction numeric DEFAULT 0,
    other_additions numeric DEFAULT 0,
    gross_salary numeric DEFAULT 0,
    status character varying(50) DEFAULT 'Draft'::character varying,
    year integer,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100)
);


ALTER TABLE public.payroll OWNER TO postgres;

--
-- Name: payroll_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payroll_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payroll_id_seq OWNER TO postgres;

--
-- Name: payroll_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payroll_id_seq OWNED BY public.payroll.id;


--
-- Name: performance_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.performance_reviews (
    id integer NOT NULL,
    staff_id integer,
    reviewer_id integer,
    review_date date,
    score integer,
    comments text,
    kpis jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100)
);


ALTER TABLE public.performance_reviews OWNER TO postgres;

--
-- Name: performance_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.performance_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.performance_reviews_id_seq OWNER TO postgres;

--
-- Name: performance_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.performance_reviews_id_seq OWNED BY public.performance_reviews.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(255),
    module character varying(50),
    description text
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: po_ddp_charges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.po_ddp_charges (
    id integer NOT NULL,
    po_id integer,
    date date,
    amount numeric DEFAULT 0,
    description character varying(255),
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    charge_type character varying(255)
);


ALTER TABLE public.po_ddp_charges OWNER TO postgres;

--
-- Name: po_ddp_charges_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.po_ddp_charges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.po_ddp_charges_id_seq OWNER TO postgres;

--
-- Name: po_ddp_charges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.po_ddp_charges_id_seq OWNED BY public.po_ddp_charges.id;


--
-- Name: po_ddp_lcy_charges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.po_ddp_lcy_charges (
    id integer NOT NULL,
    po_id integer,
    date date,
    amount numeric DEFAULT 0,
    description character varying(255),
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    amount_fcy numeric DEFAULT 0,
    fx_rate numeric DEFAULT 1,
    fcy_amount numeric(12,2) DEFAULT 0,
    payment_method character varying(50) DEFAULT 'Cash'::character varying,
    reference_no character varying(100),
    charge_type character varying(255),
    expense_name character varying(255),
    currency character varying(10) DEFAULT 'EGP'::character varying
);


ALTER TABLE public.po_ddp_lcy_charges OWNER TO postgres;

--
-- Name: po_ddp_lcy_charges_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.po_ddp_lcy_charges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.po_ddp_lcy_charges_id_seq OWNER TO postgres;

--
-- Name: po_ddp_lcy_charges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.po_ddp_lcy_charges_id_seq OWNED BY public.po_ddp_lcy_charges.id;


--
-- Name: po_expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.po_expenses (
    id integer NOT NULL,
    po_id integer,
    expense_name character varying(255),
    amount numeric(15,2),
    currency character varying(10) DEFAULT 'EGP'::character varying,
    exchange_rate numeric(15,4) DEFAULT 1,
    local_amount numeric(15,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.po_expenses OWNER TO postgres;

--
-- Name: po_expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.po_expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.po_expenses_id_seq OWNER TO postgres;

--
-- Name: po_expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.po_expenses_id_seq OWNED BY public.po_expenses.id;


--
-- Name: po_lc_registry; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.po_lc_registry (
    id integer NOT NULL,
    lc_number character varying(100) NOT NULL,
    po_id integer,
    bank_name character varying(255),
    lc_amount numeric(15,2),
    currency character varying(10),
    expiry_date date,
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.po_lc_registry OWNER TO postgres;

--
-- Name: po_lc_registry_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.po_lc_registry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.po_lc_registry_id_seq OWNER TO postgres;

--
-- Name: po_lc_registry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.po_lc_registry_id_seq OWNED BY public.po_lc_registry.id;


--
-- Name: production_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.production_logs (
    id integer NOT NULL,
    wo_id integer,
    material_name character varying(255),
    qty_used numeric(12,4),
    labor_cost numeric(15,2) DEFAULT 0,
    overhead_cost numeric(15,2) DEFAULT 0,
    logged_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.production_logs OWNER TO postgres;

--
-- Name: production_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.production_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.production_logs_id_seq OWNER TO postgres;

--
-- Name: production_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.production_logs_id_seq OWNED BY public.production_logs.id;


--
-- Name: profit_distributions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profit_distributions (
    dist_id integer NOT NULL,
    project_id integer,
    amount numeric(15,2),
    dist_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.profit_distributions OWNER TO postgres;

--
-- Name: profit_distributions_dist_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.profit_distributions_dist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profit_distributions_dist_id_seq OWNER TO postgres;

--
-- Name: profit_distributions_dist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.profit_distributions_dist_id_seq OWNED BY public.profit_distributions.dist_id;


--
-- Name: project_expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_expenses (
    expense_id integer NOT NULL,
    project_id integer,
    category character varying(100),
    amount numeric(15,2) DEFAULT 0,
    expense_date date DEFAULT CURRENT_DATE,
    note text
);


ALTER TABLE public.project_expenses OWNER TO postgres;

--
-- Name: project_expenses_expense_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_expenses_expense_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_expenses_expense_id_seq OWNER TO postgres;

--
-- Name: project_expenses_expense_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_expenses_expense_id_seq OWNED BY public.project_expenses.expense_id;


--
-- Name: project_investors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_investors (
    id integer NOT NULL,
    project_id integer,
    partner_id integer,
    partner_name character varying(255),
    investment_amount numeric(20,2) DEFAULT 0,
    investment_currency character varying(10) DEFAULT 'USD'::character varying,
    exchange_rate numeric(15,6) DEFAULT 1,
    equity_share_percent numeric(5,2) DEFAULT 0,
    profit_share_percent numeric(5,2) DEFAULT 0,
    deposit_date date DEFAULT CURRENT_DATE,
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.project_investors OWNER TO postgres;

--
-- Name: project_investors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_investors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_investors_id_seq OWNER TO postgres;

--
-- Name: project_investors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_investors_id_seq OWNED BY public.project_investors.id;


--
-- Name: project_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_items (
    item_id integer NOT NULL,
    project_id integer,
    description text,
    unit character varying(20),
    quantity numeric(15,2) DEFAULT 0,
    unit_price numeric(15,2) DEFAULT 0,
    status character varying(50) DEFAULT 'Pending'::character varying,
    executed_quantity numeric(15,2) DEFAULT 0
);


ALTER TABLE public.project_items OWNER TO postgres;

--
-- Name: project_items_item_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_items_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_items_item_id_seq OWNER TO postgres;

--
-- Name: project_items_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_items_item_id_seq OWNED BY public.project_items.item_id;


--
-- Name: project_partners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_partners (
    id integer NOT NULL,
    project_id integer,
    partner_id integer,
    share_percentage numeric(5,2) NOT NULL,
    earned_profit numeric(15,2) DEFAULT 0,
    loan_amount numeric(15,2) DEFAULT 0,
    debt_amount numeric(15,2) DEFAULT 0,
    profit_return numeric(15,2) DEFAULT 0
);


ALTER TABLE public.project_partners OWNER TO postgres;

--
-- Name: project_partners_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_partners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_partners_id_seq OWNER TO postgres;

--
-- Name: project_partners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_partners_id_seq OWNED BY public.project_partners.id;


--
-- Name: project_performance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_performance (
    id integer NOT NULL,
    project_id integer,
    period_name character varying(100),
    achievement_percent numeric(5,2) DEFAULT 0,
    achievements_summary text,
    obstacles_summary text,
    risk_level character varying(50) DEFAULT 'Low'::character varying,
    recorded_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.project_performance OWNER TO postgres;

--
-- Name: project_performance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_performance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_performance_id_seq OWNER TO postgres;

--
-- Name: project_performance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_performance_id_seq OWNED BY public.project_performance.id;


--
-- Name: project_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_profiles (
    org_unit_id integer NOT NULL,
    project_description text,
    start_date date,
    end_date date,
    expected_budget numeric(15,2),
    target_profit_margin numeric(5,2),
    expected_roi numeric(15,2)
);


ALTER TABLE public.project_profiles OWNER TO postgres;

--
-- Name: project_serial_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_serial_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_serial_seq OWNER TO postgres;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    budget numeric DEFAULT 0,
    expected_profit_percent numeric DEFAULT 0,
    expected_profit_amount numeric DEFAULT 0,
    actual_profit_amount numeric DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actual_profit_percent numeric(5,2) DEFAULT 0,
    start_date date,
    maturity_date date,
    status character varying(50) DEFAULT 'Active'::character varying,
    contract_value numeric(15,2) DEFAULT 0,
    company character varying(255),
    budget_fcy numeric DEFAULT 0,
    fx_rate numeric DEFAULT 1,
    management_pct numeric DEFAULT 0,
    partners_pct numeric DEFAULT 100,
    code character varying(50),
    currency character varying(10) DEFAULT 'EGP'::character varying,
    expected_profit_margin numeric(5,2) DEFAULT 0,
    project_duration character varying(100),
    expected_end_date date,
    admin_profit_percent numeric(5,2) DEFAULT 0,
    investor_profit_percent numeric(5,2) DEFAULT 0,
    company_id integer,
    budget_currency character varying(10) DEFAULT 'EGP'::character varying,
    manager character varying(255),
    management_fee_pct numeric(5,2) DEFAULT 10,
    investors_total_share_pct numeric(5,2) DEFAULT 90,
    project_status_notes text,
    primary_currency character varying(10) DEFAULT 'USD'::character varying,
    project_serial character varying(50),
    fcy_budget numeric(15,2) DEFAULT 0,
    end_date date,
    project_manager character varying(255),
    expected_profit numeric(15,2) DEFAULT 0,
    actual_profit numeric(15,2) DEFAULT 0,
    management_profit_percent numeric(5,2) DEFAULT 0,
    management_profit_amount numeric(15,2) DEFAULT 0,
    is_profit_distributed boolean DEFAULT false,
    org_unit_id integer,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100)
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: property_units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.property_units (
    id integer NOT NULL,
    project_name character varying(255),
    unit_number character varying(100) NOT NULL,
    unit_type character varying(100),
    area_sqm numeric(10,2),
    price numeric(15,2),
    status character varying(50) DEFAULT 'Available'::character varying,
    building_no character varying(100)
);


ALTER TABLE public.property_units OWNER TO postgres;

--
-- Name: property_units_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.property_units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.property_units_id_seq OWNER TO postgres;

--
-- Name: property_units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.property_units_id_seq OWNED BY public.property_units.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    item_description character varying(255),
    qty numeric DEFAULT 0,
    estimated_cost numeric DEFAULT 0,
    supplier character varying(255),
    project_name character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'Pending'::character varying,
    received_qty numeric DEFAULT 0,
    receipt_status character varying(50) DEFAULT 'Pending'::character varying,
    unit_price numeric DEFAULT 0,
    uom character varying(50),
    specification text,
    ddp numeric DEFAULT 0,
    total_cost_ddp numeric DEFAULT 0,
    fx_rate numeric DEFAULT 1,
    total_amount numeric(15,2) DEFAULT 0,
    expected_date date,
    discount_amount numeric DEFAULT 0,
    taxes_amount numeric DEFAULT 0,
    company_id integer,
    master_po_no character varying(100),
    lc_id integer,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100),
    created_by character varying(100)
);


ALTER TABLE public.purchase_orders OWNER TO postgres;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchase_orders_id_seq OWNER TO postgres;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchases (
    id integer NOT NULL,
    item character varying(255),
    supplier character varying(255),
    cost numeric(15,2),
    date date DEFAULT CURRENT_DATE
);


ALTER TABLE public.purchases OWNER TO postgres;

--
-- Name: purchases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchases_id_seq OWNER TO postgres;

--
-- Name: purchases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchases_id_seq OWNED BY public.purchases.id;


--
-- Name: real_estate_contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.real_estate_contracts (
    id integer NOT NULL,
    unit_id integer,
    customer_name character varying(255),
    customer_phone character varying(100),
    total_price numeric DEFAULT 0,
    down_payment numeric DEFAULT 0,
    installment_years integer DEFAULT 0,
    contract_date date,
    status character varying(50) DEFAULT 'Active'::character varying,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    company_id integer,
    customer_id integer,
    project_name character varying(255)
);


ALTER TABLE public.real_estate_contracts OWNER TO postgres;

--
-- Name: real_estate_contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.real_estate_contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.real_estate_contracts_id_seq OWNER TO postgres;

--
-- Name: real_estate_contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.real_estate_contracts_id_seq OWNED BY public.real_estate_contracts.id;


--
-- Name: real_estate_installments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.real_estate_installments (
    id integer NOT NULL,
    contract_id integer,
    due_date date,
    amount numeric DEFAULT 0,
    status character varying(50) DEFAULT 'Pending'::character varying,
    paid_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    company_id integer,
    installment_no character varying(50),
    paid_amount numeric(15,2) DEFAULT 0,
    payment_date timestamp without time zone,
    payment_method character varying(50),
    reference_no character varying(100)
);


ALTER TABLE public.real_estate_installments OWNER TO postgres;

--
-- Name: real_estate_installments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.real_estate_installments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.real_estate_installments_id_seq OWNER TO postgres;

--
-- Name: real_estate_installments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.real_estate_installments_id_seq OWNED BY public.real_estate_installments.id;


--
-- Name: real_estate_projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.real_estate_projects (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(100),
    location text,
    total_units integer DEFAULT 0,
    status character varying(50) DEFAULT 'Under Construction'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    company_id integer
);


ALTER TABLE public.real_estate_projects OWNER TO postgres;

--
-- Name: real_estate_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.real_estate_projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.real_estate_projects_id_seq OWNER TO postgres;

--
-- Name: real_estate_projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.real_estate_projects_id_seq OWNED BY public.real_estate_projects.id;


--
-- Name: real_estate_unit_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.real_estate_unit_history (
    id integer NOT NULL,
    unit_id integer,
    old_status character varying(50),
    new_status character varying(50),
    action_by character varying(255),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.real_estate_unit_history OWNER TO postgres;

--
-- Name: real_estate_unit_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.real_estate_unit_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.real_estate_unit_history_id_seq OWNER TO postgres;

--
-- Name: real_estate_unit_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.real_estate_unit_history_id_seq OWNED BY public.real_estate_unit_history.id;


--
-- Name: real_estate_units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.real_estate_units (
    id integer NOT NULL,
    project_id integer,
    unit_number character varying(100),
    type character varying(100),
    area numeric DEFAULT 0,
    floor integer,
    price numeric DEFAULT 0,
    status character varying(50) DEFAULT 'Available'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    project_name character varying(255)
);


ALTER TABLE public.real_estate_units OWNER TO postgres;

--
-- Name: real_estate_units_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.real_estate_units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.real_estate_units_id_seq OWNER TO postgres;

--
-- Name: real_estate_units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.real_estate_units_id_seq OWNED BY public.real_estate_units.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    user_id integer,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refresh_tokens_id_seq OWNER TO postgres;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: returns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.returns (
    id integer NOT NULL,
    project_name character varying(255),
    material character varying(255),
    qty numeric(15,2) DEFAULT 0,
    return_to character varying(100),
    date date DEFAULT CURRENT_DATE,
    created_by character varying(100)
);


ALTER TABLE public.returns OWNER TO postgres;

--
-- Name: returns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.returns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.returns_id_seq OWNER TO postgres;

--
-- Name: returns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.returns_id_seq OWNED BY public.returns.id;


--
-- Name: rfq; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rfq (
    id integer NOT NULL,
    project_name character varying(255),
    item_description text,
    qty numeric(15,2) DEFAULT 0,
    vendor_1 character varying(255),
    price_1 numeric(15,2) DEFAULT 0,
    vendor_2 character varying(255),
    price_2 numeric(15,2) DEFAULT 0,
    vendor_3 character varying(255),
    price_3 numeric(15,2) DEFAULT 0,
    selected_vendor character varying(255),
    status character varying(50) DEFAULT 'Pending Comparison'::character varying,
    created_by character varying(100),
    company character varying(255)
);


ALTER TABLE public.rfq OWNER TO postgres;

--
-- Name: rfq_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rfq_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rfq_id_seq OWNER TO postgres;

--
-- Name: rfq_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rfq_id_seq OWNED BY public.rfq.id;


--
-- Name: role_audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_audit_logs (
    id integer NOT NULL,
    admin_username character varying(100),
    target_user_id integer,
    old_permissions jsonb,
    new_permissions jsonb,
    ip_address character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_audit_logs OWNER TO postgres;

--
-- Name: role_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_audit_logs_id_seq OWNER TO postgres;

--
-- Name: role_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_audit_logs_id_seq OWNED BY public.role_audit_logs.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: role_permissions_matrix; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions_matrix (
    id integer NOT NULL,
    role_name character varying(50) NOT NULL,
    module_name character varying(50) NOT NULL,
    screen_name character varying(50) NOT NULL,
    action_name character varying(20) NOT NULL,
    is_allowed boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_permissions_matrix OWNER TO postgres;

--
-- Name: role_permissions_matrix_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_permissions_matrix_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_matrix_id_seq OWNER TO postgres;

--
-- Name: role_permissions_matrix_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_permissions_matrix_id_seq OWNED BY public.role_permissions_matrix.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_system_role boolean DEFAULT false
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: rtv_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rtv_transactions (
    id integer NOT NULL,
    po_id integer,
    inventory_id integer,
    qty numeric,
    value numeric,
    date date,
    reason text,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.rtv_transactions OWNER TO postgres;

--
-- Name: rtv_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rtv_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rtv_transactions_id_seq OWNER TO postgres;

--
-- Name: rtv_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rtv_transactions_id_seq OWNED BY public.rtv_transactions.id;


--
-- Name: sales_commissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_commissions (
    id integer NOT NULL,
    staff_id integer,
    source_type character varying(50),
    source_id integer,
    amount numeric DEFAULT 0,
    status character varying(50) DEFAULT 'Pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    company_id integer
);


ALTER TABLE public.sales_commissions OWNER TO postgres;

--
-- Name: sales_commissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_commissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_commissions_id_seq OWNER TO postgres;

--
-- Name: sales_commissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_commissions_id_seq OWNED BY public.sales_commissions.id;


--
-- Name: sales_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_orders (
    order_id integer NOT NULL,
    cust_id integer,
    total_amount numeric(15,2),
    status character varying(50) DEFAULT 'Pending'::character varying
);


ALTER TABLE public.sales_orders OWNER TO postgres;

--
-- Name: sales_orders_order_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_orders_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_orders_order_id_seq OWNER TO postgres;

--
-- Name: sales_orders_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_orders_order_id_seq OWNED BY public.sales_orders.order_id;


--
-- Name: sales_settlements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_settlements (
    id integer NOT NULL,
    sales_id integer,
    customer_name character varying(255),
    company_name character varying(255),
    phone character varying(100),
    deal_amount numeric DEFAULT 0,
    paid_amount numeric DEFAULT 0,
    payment_date date,
    outstanding_amount numeric DEFAULT 0,
    settlement_date date,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    customer_address character varying(255)
);


ALTER TABLE public.sales_settlements OWNER TO postgres;

--
-- Name: sales_settlements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_settlements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_settlements_id_seq OWNER TO postgres;

--
-- Name: sales_settlements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_settlements_id_seq OWNED BY public.sales_settlements.id;


--
-- Name: scheduled_emails; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scheduled_emails (
    id integer NOT NULL,
    to_email character varying(255),
    subject character varying(255),
    body text,
    send_time timestamp without time zone,
    status character varying(50) DEFAULT 'Pending'::character varying
);


ALTER TABLE public.scheduled_emails OWNER TO postgres;

--
-- Name: scheduled_emails_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.scheduled_emails_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scheduled_emails_id_seq OWNER TO postgres;

--
-- Name: scheduled_emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scheduled_emails_id_seq OWNED BY public.scheduled_emails.id;


--
-- Name: security_audit_trail; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.security_audit_trail (
    id integer NOT NULL,
    user_id integer,
    username character varying(100),
    action character varying(100),
    resource character varying(255),
    impact_level character varying(20),
    ip_address character varying(50),
    user_agent text,
    details jsonb,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.security_audit_trail OWNER TO postgres;

--
-- Name: security_audit_trail_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.security_audit_trail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.security_audit_trail_id_seq OWNER TO postgres;

--
-- Name: security_audit_trail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.security_audit_trail_id_seq OWNED BY public.security_audit_trail.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    company_name character varying(255) DEFAULT 'TED Capital'::character varying,
    currency character varying(50) DEFAULT 'LCY'::character varying,
    tax_rate numeric(5,2) DEFAULT 14.00,
    financial_year character varying(50) DEFAULT '2024'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_id_seq OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: settlement_customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settlement_customers (
    id integer NOT NULL,
    customer_name character varying(255),
    company_name character varying(255),
    phone character varying(100),
    customer_address character varying(255),
    project_name character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.settlement_customers OWNER TO postgres;

--
-- Name: settlement_customers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.settlement_customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settlement_customers_id_seq OWNER TO postgres;

--
-- Name: settlement_customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.settlement_customers_id_seq OWNED BY public.settlement_customers.id;


--
-- Name: staff; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff (
    id integer NOT NULL,
    project_name character varying(255),
    name character varying(255) NOT NULL,
    role character varying(255),
    salary numeric DEFAULT 0,
    hiring_date date DEFAULT CURRENT_DATE,
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    company character varying(255),
    default_commission_rate numeric DEFAULT 0,
    company_id integer,
    job_title character varying(100),
    department character varying(100),
    joining_date date DEFAULT CURRENT_DATE,
    id_number character varying(50),
    insurance_number character varying(50),
    bank_account character varying(100),
    iban character varying(100),
    user_id integer,
    manager_id integer,
    leave_balance numeric(4,1) DEFAULT 21,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100)
);


ALTER TABLE public.staff OWNER TO postgres;

--
-- Name: staff_advances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_advances (
    id integer NOT NULL,
    staff_id integer,
    amount numeric(15,2) DEFAULT 0,
    request_date date DEFAULT CURRENT_DATE,
    deduction_per_month numeric(15,2) DEFAULT 0,
    remaining_balance numeric(15,2) DEFAULT 0,
    status character varying(50) DEFAULT 'Pending'::character varying,
    repayment_method character varying(100)
);


ALTER TABLE public.staff_advances OWNER TO postgres;

--
-- Name: staff_advances_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.staff_advances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staff_advances_id_seq OWNER TO postgres;

--
-- Name: staff_advances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staff_advances_id_seq OWNED BY public.staff_advances.id;


--
-- Name: staff_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.staff_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staff_id_seq OWNER TO postgres;

--
-- Name: staff_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staff_id_seq OWNED BY public.staff.id;


--
-- Name: stakeholder_engagements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stakeholder_engagements (
    id integer NOT NULL,
    stakeholder_id integer,
    org_unit_id integer,
    role_type character varying(100),
    equity_percentage numeric(5,2) DEFAULT 0,
    profit_share_percentage numeric(5,2) DEFAULT 0,
    expected_financial_return numeric(15,2) DEFAULT 0,
    management_fees numeric(15,2) DEFAULT 0,
    valid_from date,
    valid_to date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.stakeholder_engagements OWNER TO postgres;

--
-- Name: stakeholder_engagements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stakeholder_engagements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stakeholder_engagements_id_seq OWNER TO postgres;

--
-- Name: stakeholder_engagements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stakeholder_engagements_id_seq OWNED BY public.stakeholder_engagements.id;


--
-- Name: stakeholders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stakeholders (
    id integer NOT NULL,
    stakeholder_type character varying(50),
    name character varying(255) NOT NULL,
    contact_details text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.stakeholders OWNER TO postgres;

--
-- Name: stakeholders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stakeholders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stakeholders_id_seq OWNER TO postgres;

--
-- Name: stakeholders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stakeholders_id_seq OWNED BY public.stakeholders.id;


--
-- Name: stock_adjustments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_adjustments (
    id integer NOT NULL,
    inventory_id integer,
    old_qty numeric(15,2),
    new_qty numeric(15,2),
    difference numeric(15,2),
    reason text,
    date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100)
);


ALTER TABLE public.stock_adjustments OWNER TO postgres;

--
-- Name: stock_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_adjustments_id_seq OWNER TO postgres;

--
-- Name: stock_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_adjustments_id_seq OWNED BY public.stock_adjustments.id;


--
-- Name: stock_issues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_issues (
    id integer NOT NULL,
    project_id integer,
    item_name character varying(255),
    quantity_issued numeric,
    issue_date timestamp without time zone DEFAULT now()
);


ALTER TABLE public.stock_issues OWNER TO postgres;

--
-- Name: stock_issues_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_issues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_issues_id_seq OWNER TO postgres;

--
-- Name: stock_issues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_issues_id_seq OWNED BY public.stock_issues.id;


--
-- Name: subcontractor_invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subcontractor_invoices (
    id integer NOT NULL,
    subcontractor_id integer,
    subcontractor_name character varying(255),
    amount numeric DEFAULT 0,
    progress_percent numeric DEFAULT 0,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    date date DEFAULT CURRENT_DATE,
    created_by character varying(100),
    gross_amount numeric(15,2) DEFAULT 0.00,
    retention_deduction numeric(15,2) DEFAULT 0.00,
    dp_recovery numeric(15,2) DEFAULT 0.00,
    material_deduction numeric(15,2) DEFAULT 0.00,
    tax_deduction numeric(15,2) DEFAULT 0.00,
    net_amount numeric(15,2) DEFAULT 0.00,
    status character varying(50) DEFAULT 'إعداد'::character varying,
    prev_qty numeric(15,2) DEFAULT 0,
    curr_qty numeric(15,2) DEFAULT 0,
    sub_item_id integer,
    company_id integer,
    project_id integer
);


ALTER TABLE public.subcontractor_invoices OWNER TO postgres;

--
-- Name: subcontractor_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subcontractor_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subcontractor_invoices_id_seq OWNER TO postgres;

--
-- Name: subcontractor_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subcontractor_invoices_id_seq OWNED BY public.subcontractor_invoices.id;


--
-- Name: subcontractor_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subcontractor_items (
    id integer NOT NULL,
    subcontractor_id integer,
    boq_id integer,
    item_desc character varying(255) NOT NULL,
    assigned_qty numeric(15,2) DEFAULT 0 NOT NULL,
    unit_price numeric(15,2) DEFAULT 0 NOT NULL,
    total_price numeric(15,2) DEFAULT 0 NOT NULL,
    start_date date,
    end_date date
);


ALTER TABLE public.subcontractor_items OWNER TO postgres;

--
-- Name: subcontractor_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subcontractor_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subcontractor_items_id_seq OWNER TO postgres;

--
-- Name: subcontractor_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subcontractor_items_id_seq OWNED BY public.subcontractor_items.id;


--
-- Name: subcontractor_statements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subcontractor_statements (
    id integer NOT NULL,
    sub_name character varying(255) NOT NULL,
    type character varying(50),
    amount numeric DEFAULT 0,
    details text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.subcontractor_statements OWNER TO postgres;

--
-- Name: subcontractor_statements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subcontractor_statements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subcontractor_statements_id_seq OWNER TO postgres;

--
-- Name: subcontractor_statements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subcontractor_statements_id_seq OWNED BY public.subcontractor_statements.id;


--
-- Name: subcontractors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subcontractors (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    contract_value numeric DEFAULT 0,
    completed_percent numeric DEFAULT 0,
    paid_amount numeric DEFAULT 0,
    project_name character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    contract_type character varying(50) DEFAULT 'مقطوعية'::character varying,
    start_date date,
    end_date date,
    retention_percent numeric(5,2) DEFAULT 5.00,
    down_payment_percent numeric(5,2) DEFAULT 0.00,
    status character varying(50) DEFAULT 'Active'::character varying,
    boq_linked boolean DEFAULT false,
    company_id integer,
    contact_person character varying(255),
    phone character varying(50)
);


ALTER TABLE public.subcontractors OWNER TO postgres;

--
-- Name: subcontractors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subcontractors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subcontractors_id_seq OWNER TO postgres;

--
-- Name: subcontractors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subcontractors_id_seq OWNED BY public.subcontractors.id;


--
-- Name: supplier_ratings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplier_ratings (
    id integer NOT NULL,
    supplier_name character varying(255) NOT NULL,
    quality_score numeric(3,2) DEFAULT 5.0,
    delivery_score numeric(3,2) DEFAULT 5.0,
    price_consistency_score numeric(3,2) DEFAULT 5.0,
    total_pos_completed integer DEFAULT 0,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.supplier_ratings OWNER TO postgres;

--
-- Name: supplier_ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.supplier_ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplier_ratings_id_seq OWNER TO postgres;

--
-- Name: supplier_ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.supplier_ratings_id_seq OWNED BY public.supplier_ratings.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100),
    rating character varying(50)
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: system_backups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_backups (
    id integer NOT NULL,
    backup_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    backup_type character varying(20) NOT NULL,
    size_bytes bigint,
    status character varying(20) DEFAULT 'SUCCESS'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_backups OWNER TO postgres;

--
-- Name: system_backups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_backups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_backups_id_seq OWNER TO postgres;

--
-- Name: system_backups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_backups_id_seq OWNED BY public.system_backups.id;


--
-- Name: system_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_config (
    id integer NOT NULL,
    config_key character varying(100),
    config_value jsonb,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.system_config OWNER TO postgres;

--
-- Name: system_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_config_id_seq OWNER TO postgres;

--
-- Name: system_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_config_id_seq OWNED BY public.system_config.id;


--
-- Name: system_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_events (
    id integer NOT NULL,
    event_type character varying(100) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(20) DEFAULT 'Pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    source_module character varying(50)
);


ALTER TABLE public.system_events OWNER TO postgres;

--
-- Name: system_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_events_id_seq OWNER TO postgres;

--
-- Name: system_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_events_id_seq OWNED BY public.system_events.id;


--
-- Name: system_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_notifications (
    id integer NOT NULL,
    type character varying(50),
    title character varying(255),
    message text,
    is_read boolean DEFAULT false,
    link character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer
);


ALTER TABLE public.system_notifications OWNER TO postgres;

--
-- Name: system_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_notifications_id_seq OWNER TO postgres;

--
-- Name: system_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_notifications_id_seq OWNED BY public.system_notifications.id;


--
-- Name: system_parameters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_parameters (
    id integer NOT NULL,
    category character varying(50) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE public.system_parameters OWNER TO postgres;

--
-- Name: system_parameters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_parameters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_parameters_id_seq OWNER TO postgres;

--
-- Name: system_parameters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_parameters_id_seq OWNED BY public.system_parameters.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    project_name character varying(255),
    task_name character varying(255),
    start_date date,
    end_date date,
    progress_percent numeric(5,2) DEFAULT 0,
    status character varying(50) DEFAULT 'Pending'::character varying,
    created_by character varying(100)
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasks_id_seq OWNER TO postgres;

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: tenant_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenant_settings (
    id integer NOT NULL,
    tenant_name character varying(100) NOT NULL,
    domain character varying(255),
    brand_colors jsonb DEFAULT '{"primary": "#4f46e5", "secondary": "#0f172a"}'::jsonb,
    logo_url text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tenant_settings OWNER TO postgres;

--
-- Name: tenant_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tenant_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tenant_settings_id_seq OWNER TO postgres;

--
-- Name: tenant_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tenant_settings_id_seq OWNED BY public.tenant_settings.id;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenants (
    id integer NOT NULL,
    name_ar character varying(255) NOT NULL,
    tenant_key character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tenants OWNER TO postgres;

--
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tenants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tenants_id_seq OWNER TO postgres;

--
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    trans_id integer NOT NULL,
    acc_id integer,
    amount numeric(15,2),
    description text,
    trans_date timestamp with time zone DEFAULT now()
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: transactions_trans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_trans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_trans_id_seq OWNER TO postgres;

--
-- Name: transactions_trans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_trans_id_seq OWNED BY public.transactions.trans_id;


--
-- Name: unit_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.unit_history (
    id integer NOT NULL,
    unit_id integer,
    old_status character varying(50),
    new_status character varying(50),
    changed_by character varying(100),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.unit_history OWNER TO postgres;

--
-- Name: unit_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.unit_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.unit_history_id_seq OWNER TO postgres;

--
-- Name: unit_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.unit_history_id_seq OWNED BY public.unit_history.id;


--
-- Name: user_org_units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_org_units (
    user_id integer NOT NULL,
    org_unit_id integer NOT NULL,
    is_primary boolean DEFAULT false
);


ALTER TABLE public.user_org_units OWNER TO postgres;

--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_preferences (
    user_id integer NOT NULL,
    language character varying(5) DEFAULT 'ar'::character varying,
    timezone character varying(50) DEFAULT 'Africa/Cairo'::character varying,
    theme_mode character varying(10) DEFAULT 'light'::character varying,
    date_format character varying(20) DEFAULT 'DD/MM/YYYY'::character varying,
    dashboard_layout jsonb DEFAULT '{}'::jsonb,
    table_configs jsonb DEFAULT '{}'::jsonb,
    sidebar_collapsed boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_preferences OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    user_id integer NOT NULL,
    role_id integer NOT NULL
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'Engineer'::character varying NOT NULL,
    status character varying(20) DEFAULT 'Active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    permissions jsonb DEFAULT '{}'::jsonb,
    email character varying(255),
    linked_company character varying(255),
    two_factor_secret character varying(255),
    is_2fa_enabled boolean DEFAULT false,
    allowed_companies jsonb DEFAULT '[]'::jsonb,
    allowed_projects jsonb DEFAULT '[]'::jsonb,
    last_login timestamp without time zone,
    allowed_modules jsonb DEFAULT '[]'::jsonb,
    allowed_functions jsonb DEFAULT '[]'::jsonb,
    allowed_notifications jsonb DEFAULT '[]'::jsonb,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vendor_bills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendor_bills (
    id integer NOT NULL,
    vendor_name character varying(255) NOT NULL,
    project_name character varying(255),
    bill_date date,
    due_date date,
    amount numeric(15,2) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    total_amount numeric(15,2) DEFAULT 0,
    paid_amount numeric(15,2) DEFAULT 0,
    status character varying(50) DEFAULT 'Pending'::character varying,
    description text,
    created_by character varying(100) DEFAULT 'Admin'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.vendor_bills OWNER TO postgres;

--
-- Name: vendor_bills_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vendor_bills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vendor_bills_id_seq OWNER TO postgres;

--
-- Name: vendor_bills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vendor_bills_id_seq OWNED BY public.vendor_bills.id;


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendors (
    vendor_id integer NOT NULL,
    name character varying(255),
    contact_info text
);


ALTER TABLE public.vendors OWNER TO postgres;

--
-- Name: vendors_vendor_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vendors_vendor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vendors_vendor_id_seq OWNER TO postgres;

--
-- Name: vendors_vendor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vendors_vendor_id_seq OWNED BY public.vendors.vendor_id;


--
-- Name: voucher_sequences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.voucher_sequences (
    company_id integer NOT NULL,
    last_jv_no integer DEFAULT 0
);


ALTER TABLE public.voucher_sequences OWNER TO postgres;

--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouses (
    id integer NOT NULL,
    name character varying(255),
    location text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by character varying(100)
);


ALTER TABLE public.warehouses OWNER TO postgres;

--
-- Name: warehouses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.warehouses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.warehouses_id_seq OWNER TO postgres;

--
-- Name: warehouses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.warehouses_id_seq OWNED BY public.warehouses.id;


--
-- Name: work_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_orders (
    id integer NOT NULL,
    bom_id integer,
    wo_number character varying(50) NOT NULL,
    target_qty numeric(12,2) NOT NULL,
    produced_qty numeric(12,2) DEFAULT 0,
    status character varying(50) DEFAULT 'Planned'::character varying,
    start_date date,
    end_date date,
    project_name character varying(255),
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.work_orders OWNER TO postgres;

--
-- Name: work_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.work_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.work_orders_id_seq OWNER TO postgres;

--
-- Name: work_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.work_orders_id_seq OWNED BY public.work_orders.id;


--
-- Name: workflow_definitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_definitions (
    id integer NOT NULL,
    module_name character varying(50) NOT NULL,
    event_trigger character varying(50) NOT NULL,
    conditions jsonb DEFAULT '{}'::jsonb,
    steps jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    min_amount numeric(15,2) DEFAULT 0,
    require_maker_checker boolean DEFAULT true
);


ALTER TABLE public.workflow_definitions OWNER TO postgres;

--
-- Name: workflow_definitions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workflow_definitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workflow_definitions_id_seq OWNER TO postgres;

--
-- Name: workflow_definitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workflow_definitions_id_seq OWNED BY public.workflow_definitions.id;


--
-- Name: workflow_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_history (
    id integer NOT NULL,
    workflow_id integer,
    record_id integer,
    status character varying(50),
    comments text,
    action_by character varying(100),
    action_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.workflow_history OWNER TO postgres;

--
-- Name: workflow_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workflow_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workflow_history_id_seq OWNER TO postgres;

--
-- Name: workflow_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workflow_history_id_seq OWNED BY public.workflow_history.id;


--
-- Name: workflow_instances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_instances (
    id integer NOT NULL,
    definition_id integer,
    record_id character varying(255) NOT NULL,
    current_step integer DEFAULT 1,
    status character varying(20) DEFAULT 'IN_PROGRESS'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    maker_username character varying(100)
);


ALTER TABLE public.workflow_instances OWNER TO postgres;

--
-- Name: workflow_instances_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workflow_instances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workflow_instances_id_seq OWNER TO postgres;

--
-- Name: workflow_instances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workflow_instances_id_seq OWNED BY public.workflow_instances.id;


--
-- Name: workflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflows (
    id integer NOT NULL,
    module_name character varying(100),
    step_name character varying(255),
    required_role character varying(50),
    min_amount numeric(15,2) DEFAULT 0,
    is_final_step boolean DEFAULT false,
    next_step_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.workflows OWNER TO postgres;

--
-- Name: workflows_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workflows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workflows_id_seq OWNER TO postgres;

--
-- Name: workflows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workflows_id_seq OWNED BY public.workflows.id;


--
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- Name: accounts_chart acc_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_chart ALTER COLUMN acc_id SET DEFAULT nextval('public.accounts_chart_acc_id_seq'::regclass);


--
-- Name: active_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_sessions ALTER COLUMN id SET DEFAULT nextval('public.active_sessions_id_seq'::regclass);


--
-- Name: approval_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_history ALTER COLUMN id SET DEFAULT nextval('public.approval_history_id_seq'::regclass);


--
-- Name: approval_limits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_limits ALTER COLUMN id SET DEFAULT nextval('public.approval_limits_id_seq'::regclass);


--
-- Name: ar_invoice_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ar_invoice_items ALTER COLUMN id SET DEFAULT nextval('public.ar_invoice_items_id_seq'::regclass);


--
-- Name: ar_invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ar_invoices ALTER COLUMN id SET DEFAULT nextval('public.ar_invoices_id_seq'::regclass);


--
-- Name: asset_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_categories ALTER COLUMN id SET DEFAULT nextval('public.asset_categories_id_seq'::regclass);


--
-- Name: asset_depreciation_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_depreciation_logs ALTER COLUMN id SET DEFAULT nextval('public.asset_depreciation_logs_id_seq'::regclass);


--
-- Name: attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments ALTER COLUMN id SET DEFAULT nextval('public.attachments_id_seq'::regclass);


--
-- Name: attendance att_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance ALTER COLUMN att_id SET DEFAULT nextval('public.attendance_att_id_seq'::regclass);


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: audit_trail id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_trail ALTER COLUMN id SET DEFAULT nextval('public.audit_trail_id_seq'::regclass);


--
-- Name: backups_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backups_log ALTER COLUMN id SET DEFAULT nextval('public.backups_log_id_seq'::regclass);


--
-- Name: batch_jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch_jobs ALTER COLUMN id SET DEFAULT nextval('public.batch_jobs_id_seq'::regclass);


--
-- Name: board_committees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_committees ALTER COLUMN id SET DEFAULT nextval('public.board_committees_id_seq'::regclass);


--
-- Name: board_members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_members ALTER COLUMN id SET DEFAULT nextval('public.board_members_id_seq'::regclass);


--
-- Name: bom_headers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_headers ALTER COLUMN id SET DEFAULT nextval('public.bom_headers_id_seq'::regclass);


--
-- Name: bom_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_items ALTER COLUMN id SET DEFAULT nextval('public.bom_items_id_seq'::regclass);


--
-- Name: boq id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boq ALTER COLUMN id SET DEFAULT nextval('public.boq_id_seq'::regclass);


--
-- Name: budgets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets ALTER COLUMN id SET DEFAULT nextval('public.budgets_id_seq'::regclass);


--
-- Name: chart_of_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts ALTER COLUMN id SET DEFAULT nextval('public.chart_of_accounts_id_seq'::regclass);


--
-- Name: client_consumptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_consumptions ALTER COLUMN id SET DEFAULT nextval('public.client_consumptions_id_seq'::regclass);


--
-- Name: client_delayed_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_delayed_payments ALTER COLUMN id SET DEFAULT nextval('public.client_delayed_payments_id_seq'::regclass);


--
-- Name: client_interactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_interactions ALTER COLUMN id SET DEFAULT nextval('public.client_interactions_id_seq'::regclass);


--
-- Name: client_payment_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_payment_history ALTER COLUMN id SET DEFAULT nextval('public.client_payment_history_id_seq'::regclass);


--
-- Name: client_preorders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_preorders ALTER COLUMN id SET DEFAULT nextval('public.client_preorders_id_seq'::regclass);


--
-- Name: client_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_profiles ALTER COLUMN id SET DEFAULT nextval('public.client_profiles_id_seq'::regclass);


--
-- Name: client_refunds id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_refunds ALTER COLUMN id SET DEFAULT nextval('public.client_refunds_id_seq'::regclass);


--
-- Name: client_stock_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_stock_transactions ALTER COLUMN id SET DEFAULT nextval('public.client_stock_transactions_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: consolidation_runs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consolidation_runs ALTER COLUMN id SET DEFAULT nextval('public.consolidation_runs_id_seq'::regclass);


--
-- Name: contracts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts ALTER COLUMN id SET DEFAULT nextval('public.contracts_id_seq'::regclass);


--
-- Name: crm_interactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_interactions ALTER COLUMN id SET DEFAULT nextval('public.crm_interactions_id_seq'::regclass);


--
-- Name: crm_leads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_leads ALTER COLUMN id SET DEFAULT nextval('public.crm_leads_id_seq'::regclass);


--
-- Name: crm_opportunities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_opportunities ALTER COLUMN id SET DEFAULT nextval('public.crm_opportunities_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: daily_fx_rates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_fx_rates ALTER COLUMN id SET DEFAULT nextval('public.daily_fx_rates_id_seq'::regclass);


--
-- Name: daily_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_reports ALTER COLUMN id SET DEFAULT nextval('public.daily_reports_id_seq'::regclass);


--
-- Name: depreciation_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.depreciation_logs ALTER COLUMN id SET DEFAULT nextval('public.depreciation_logs_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: email_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_logs ALTER COLUMN id SET DEFAULT nextval('public.email_logs_id_seq'::regclass);


--
-- Name: email_triggers_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_triggers_config ALTER COLUMN id SET DEFAULT nextval('public.email_triggers_config_id_seq'::regclass);


--
-- Name: emails_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emails_log ALTER COLUMN id SET DEFAULT nextval('public.emails_log_id_seq'::regclass);


--
-- Name: employee_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_documents ALTER COLUMN id SET DEFAULT nextval('public.employee_documents_id_seq'::regclass);


--
-- Name: employees emp_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees ALTER COLUMN emp_id SET DEFAULT nextval('public.employees_emp_id_seq'::regclass);


--
-- Name: eoy_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eoy_logs ALTER COLUMN id SET DEFAULT nextval('public.eoy_logs_id_seq'::regclass);


--
-- Name: equity_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equity_history ALTER COLUMN id SET DEFAULT nextval('public.equity_history_id_seq'::regclass);


--
-- Name: erp_inventory item_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.erp_inventory ALTER COLUMN item_id SET DEFAULT nextval('public.erp_inventory_item_id_seq'::regclass);


--
-- Name: erp_projects project_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.erp_projects ALTER COLUMN project_id SET DEFAULT nextval('public.erp_projects_project_id_seq'::regclass);


--
-- Name: exchange_rates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exchange_rates ALTER COLUMN id SET DEFAULT nextval('public.exchange_rates_id_seq'::regclass);


--
-- Name: field_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_permissions ALTER COLUMN id SET DEFAULT nextval('public.field_permissions_id_seq'::regclass);


--
-- Name: financial_discrepancies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_discrepancies ALTER COLUMN id SET DEFAULT nextval('public.financial_discrepancies_id_seq'::regclass);


--
-- Name: financial_periods id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_periods ALTER COLUMN id SET DEFAULT nextval('public.financial_periods_id_seq'::regclass);


--
-- Name: fiscal_periods id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fiscal_periods ALTER COLUMN id SET DEFAULT nextval('public.fiscal_periods_id_seq'::regclass);


--
-- Name: fixed_assets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_assets ALTER COLUMN id SET DEFAULT nextval('public.fixed_assets_id_seq'::regclass);


--
-- Name: fx_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fx_history ALTER COLUMN id SET DEFAULT nextval('public.fx_history_id_seq'::regclass);


--
-- Name: fx_rates_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fx_rates_history ALTER COLUMN id SET DEFAULT nextval('public.fx_rates_history_id_seq'::regclass);


--
-- Name: gl_mappings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gl_mappings ALTER COLUMN id SET DEFAULT nextval('public.gl_mappings_id_seq'::regclass);


--
-- Name: goods_receipt_notes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goods_receipt_notes ALTER COLUMN id SET DEFAULT nextval('public.goods_receipt_notes_id_seq'::regclass);


--
-- Name: grn id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grn ALTER COLUMN id SET DEFAULT nextval('public.grn_id_seq'::regclass);


--
-- Name: installments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installments ALTER COLUMN id SET DEFAULT nextval('public.installments_id_seq'::regclass);


--
-- Name: intercompany_mappings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intercompany_mappings ALTER COLUMN id SET DEFAULT nextval('public.intercompany_mappings_id_seq'::regclass);


--
-- Name: inventory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory ALTER COLUMN id SET DEFAULT nextval('public.inventory_id_seq1'::regclass);


--
-- Name: inventory_bookings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_bookings ALTER COLUMN id SET DEFAULT nextval('public.inventory_bookings_id_seq'::regclass);


--
-- Name: inventory_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_id_seq'::regclass);


--
-- Name: inventory_reservations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_reservations ALTER COLUMN id SET DEFAULT nextval('public.inventory_reservations_id_seq'::regclass);


--
-- Name: inventory_sales id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_sales ALTER COLUMN id SET DEFAULT nextval('public.inventory_sales_id_seq'::regclass);


--
-- Name: inventory_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions ALTER COLUMN id SET DEFAULT nextval('public.inventory_transactions_id_seq'::regclass);


--
-- Name: inventory_transfers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers ALTER COLUMN id SET DEFAULT nextval('public.inventory_transfers_id_seq'::regclass);


--
-- Name: inventory_usage usage_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_usage ALTER COLUMN usage_id SET DEFAULT nextval('public.inventory_usage_usage_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: journal_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_entries ALTER COLUMN id SET DEFAULT nextval('public.journal_entries_id_seq'::regclass);


--
-- Name: leave_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests ALTER COLUMN id SET DEFAULT nextval('public.leave_requests_id_seq'::regclass);


--
-- Name: leaves id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaves ALTER COLUMN id SET DEFAULT nextval('public.leaves_id_seq'::regclass);


--
-- Name: ledger id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger ALTER COLUMN id SET DEFAULT nextval('public.ledger_new_id_seq'::regclass);


--
-- Name: legal_entities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_entities ALTER COLUMN id SET DEFAULT nextval('public.legal_entities_id_seq'::regclass);


--
-- Name: material_usage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_usage ALTER COLUMN id SET DEFAULT nextval('public.material_usage_id_seq'::regclass);


--
-- Name: metadata_entities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metadata_entities ALTER COLUMN id SET DEFAULT nextval('public.metadata_entities_id_seq'::regclass);


--
-- Name: metadata_fields id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metadata_fields ALTER COLUMN id SET DEFAULT nextval('public.metadata_fields_id_seq'::regclass);


--
-- Name: new_module id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.new_module ALTER COLUMN id SET DEFAULT nextval('public.new_module_id_seq'::regclass);


--
-- Name: notification_subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.notification_subscriptions_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: org_units id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.org_units ALTER COLUMN id SET DEFAULT nextval('public.org_units_id_seq'::regclass);


--
-- Name: organization_units id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_units ALTER COLUMN id SET DEFAULT nextval('public.organization_units_id_seq'::regclass);


--
-- Name: outstanding_dues id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outstanding_dues ALTER COLUMN id SET DEFAULT nextval('public.outstanding_dues_id_seq'::regclass);


--
-- Name: outstanding_settlements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outstanding_settlements ALTER COLUMN id SET DEFAULT nextval('public.outstanding_settlements_id_seq'::regclass);


--
-- Name: partner_deposits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_deposits ALTER COLUMN id SET DEFAULT nextval('public.partner_deposits_id_seq'::regclass);


--
-- Name: partner_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_documents ALTER COLUMN id SET DEFAULT nextval('public.partner_documents_id_seq'::regclass);


--
-- Name: partner_financial_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_financial_log ALTER COLUMN id SET DEFAULT nextval('public.partner_financial_log_id_seq'::regclass);


--
-- Name: partner_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_history ALTER COLUMN id SET DEFAULT nextval('public.partner_history_id_seq'::regclass);


--
-- Name: partner_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_transactions ALTER COLUMN id SET DEFAULT nextval('public.partner_transactions_id_seq'::regclass);


--
-- Name: partner_withdrawals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_withdrawals ALTER COLUMN id SET DEFAULT nextval('public.partner_withdrawals_id_seq'::regclass);


--
-- Name: partners id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partners ALTER COLUMN id SET DEFAULT nextval('public.partners_id_seq'::regclass);


--
-- Name: payment_allocations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_allocations ALTER COLUMN id SET DEFAULT nextval('public.payment_allocations_id_seq'::regclass);


--
-- Name: payment_receipts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_receipts ALTER COLUMN id SET DEFAULT nextval('public.payment_receipts_id_seq'::regclass);


--
-- Name: payroll id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll ALTER COLUMN id SET DEFAULT nextval('public.payroll_id_seq'::regclass);


--
-- Name: performance_reviews id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performance_reviews ALTER COLUMN id SET DEFAULT nextval('public.performance_reviews_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: po_ddp_charges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_ddp_charges ALTER COLUMN id SET DEFAULT nextval('public.po_ddp_charges_id_seq'::regclass);


--
-- Name: po_ddp_lcy_charges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_ddp_lcy_charges ALTER COLUMN id SET DEFAULT nextval('public.po_ddp_lcy_charges_id_seq'::regclass);


--
-- Name: po_expenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_expenses ALTER COLUMN id SET DEFAULT nextval('public.po_expenses_id_seq'::regclass);


--
-- Name: po_lc_registry id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_lc_registry ALTER COLUMN id SET DEFAULT nextval('public.po_lc_registry_id_seq'::regclass);


--
-- Name: production_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_logs ALTER COLUMN id SET DEFAULT nextval('public.production_logs_id_seq'::regclass);


--
-- Name: profit_distributions dist_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profit_distributions ALTER COLUMN dist_id SET DEFAULT nextval('public.profit_distributions_dist_id_seq'::regclass);


--
-- Name: project_expenses expense_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_expenses ALTER COLUMN expense_id SET DEFAULT nextval('public.project_expenses_expense_id_seq'::regclass);


--
-- Name: project_investors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_investors ALTER COLUMN id SET DEFAULT nextval('public.project_investors_id_seq'::regclass);


--
-- Name: project_items item_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_items ALTER COLUMN item_id SET DEFAULT nextval('public.project_items_item_id_seq'::regclass);


--
-- Name: project_partners id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_partners ALTER COLUMN id SET DEFAULT nextval('public.project_partners_id_seq'::regclass);


--
-- Name: project_performance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_performance ALTER COLUMN id SET DEFAULT nextval('public.project_performance_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: property_units id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_units ALTER COLUMN id SET DEFAULT nextval('public.property_units_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: purchases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases ALTER COLUMN id SET DEFAULT nextval('public.purchases_id_seq'::regclass);


--
-- Name: real_estate_contracts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_contracts ALTER COLUMN id SET DEFAULT nextval('public.real_estate_contracts_id_seq'::regclass);


--
-- Name: real_estate_installments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_installments ALTER COLUMN id SET DEFAULT nextval('public.real_estate_installments_id_seq'::regclass);


--
-- Name: real_estate_projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_projects ALTER COLUMN id SET DEFAULT nextval('public.real_estate_projects_id_seq'::regclass);


--
-- Name: real_estate_unit_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_unit_history ALTER COLUMN id SET DEFAULT nextval('public.real_estate_unit_history_id_seq'::regclass);


--
-- Name: real_estate_units id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_units ALTER COLUMN id SET DEFAULT nextval('public.real_estate_units_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: returns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.returns ALTER COLUMN id SET DEFAULT nextval('public.returns_id_seq'::regclass);


--
-- Name: rfq id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfq ALTER COLUMN id SET DEFAULT nextval('public.rfq_id_seq'::regclass);


--
-- Name: role_audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.role_audit_logs_id_seq'::regclass);


--
-- Name: role_permissions_matrix id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions_matrix ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_matrix_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: rtv_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rtv_transactions ALTER COLUMN id SET DEFAULT nextval('public.rtv_transactions_id_seq'::regclass);


--
-- Name: sales_commissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_commissions ALTER COLUMN id SET DEFAULT nextval('public.sales_commissions_id_seq'::regclass);


--
-- Name: sales_orders order_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_orders ALTER COLUMN order_id SET DEFAULT nextval('public.sales_orders_order_id_seq'::regclass);


--
-- Name: sales_settlements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_settlements ALTER COLUMN id SET DEFAULT nextval('public.sales_settlements_id_seq'::regclass);


--
-- Name: scheduled_emails id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scheduled_emails ALTER COLUMN id SET DEFAULT nextval('public.scheduled_emails_id_seq'::regclass);


--
-- Name: security_audit_trail id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_audit_trail ALTER COLUMN id SET DEFAULT nextval('public.security_audit_trail_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: settlement_customers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlement_customers ALTER COLUMN id SET DEFAULT nextval('public.settlement_customers_id_seq'::regclass);


--
-- Name: staff id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff ALTER COLUMN id SET DEFAULT nextval('public.staff_id_seq'::regclass);


--
-- Name: staff_advances id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_advances ALTER COLUMN id SET DEFAULT nextval('public.staff_advances_id_seq'::regclass);


--
-- Name: stakeholder_engagements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stakeholder_engagements ALTER COLUMN id SET DEFAULT nextval('public.stakeholder_engagements_id_seq'::regclass);


--
-- Name: stakeholders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stakeholders ALTER COLUMN id SET DEFAULT nextval('public.stakeholders_id_seq'::regclass);


--
-- Name: stock_adjustments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments ALTER COLUMN id SET DEFAULT nextval('public.stock_adjustments_id_seq'::regclass);


--
-- Name: stock_issues id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_issues ALTER COLUMN id SET DEFAULT nextval('public.stock_issues_id_seq'::regclass);


--
-- Name: subcontractor_invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcontractor_invoices ALTER COLUMN id SET DEFAULT nextval('public.subcontractor_invoices_id_seq'::regclass);


--
-- Name: subcontractor_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcontractor_items ALTER COLUMN id SET DEFAULT nextval('public.subcontractor_items_id_seq'::regclass);


--
-- Name: subcontractor_statements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcontractor_statements ALTER COLUMN id SET DEFAULT nextval('public.subcontractor_statements_id_seq'::regclass);


--
-- Name: subcontractors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcontractors ALTER COLUMN id SET DEFAULT nextval('public.subcontractors_id_seq'::regclass);


--
-- Name: supplier_ratings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_ratings ALTER COLUMN id SET DEFAULT nextval('public.supplier_ratings_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: system_backups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_backups ALTER COLUMN id SET DEFAULT nextval('public.system_backups_id_seq'::regclass);


--
-- Name: system_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config ALTER COLUMN id SET DEFAULT nextval('public.system_config_id_seq'::regclass);


--
-- Name: system_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_events ALTER COLUMN id SET DEFAULT nextval('public.system_events_id_seq'::regclass);


--
-- Name: system_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_notifications ALTER COLUMN id SET DEFAULT nextval('public.system_notifications_id_seq'::regclass);


--
-- Name: system_parameters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_parameters ALTER COLUMN id SET DEFAULT nextval('public.system_parameters_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: tenant_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_settings ALTER COLUMN id SET DEFAULT nextval('public.tenant_settings_id_seq'::regclass);


--
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- Name: transactions trans_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN trans_id SET DEFAULT nextval('public.transactions_trans_id_seq'::regclass);


--
-- Name: unit_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_history ALTER COLUMN id SET DEFAULT nextval('public.unit_history_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vendor_bills id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_bills ALTER COLUMN id SET DEFAULT nextval('public.vendor_bills_id_seq'::regclass);


--
-- Name: vendors vendor_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors ALTER COLUMN vendor_id SET DEFAULT nextval('public.vendors_vendor_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Name: work_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_orders ALTER COLUMN id SET DEFAULT nextval('public.work_orders_id_seq'::regclass);


--
-- Name: workflow_definitions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_definitions ALTER COLUMN id SET DEFAULT nextval('public.workflow_definitions_id_seq'::regclass);


--
-- Name: workflow_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_history ALTER COLUMN id SET DEFAULT nextval('public.workflow_history_id_seq'::regclass);


--
-- Name: workflow_instances id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_instances ALTER COLUMN id SET DEFAULT nextval('public.workflow_instances_id_seq'::regclass);


--
-- Name: workflows id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows ALTER COLUMN id SET DEFAULT nextval('public.workflows_id_seq'::regclass);


--
-- Name: accounts_chart accounts_chart_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_chart
    ADD CONSTRAINT accounts_chart_pkey PRIMARY KEY (acc_id);


--
-- Name: accounts accounts_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_code_key UNIQUE (code);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: active_sessions active_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_sessions
    ADD CONSTRAINT active_sessions_pkey PRIMARY KEY (id);


--
-- Name: active_sessions active_sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_sessions
    ADD CONSTRAINT active_sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: approval_history approval_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_history
    ADD CONSTRAINT approval_history_pkey PRIMARY KEY (id);


--
-- Name: approval_limits approval_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_limits
    ADD CONSTRAINT approval_limits_pkey PRIMARY KEY (id);


--
-- Name: ar_invoice_items ar_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ar_invoice_items
    ADD CONSTRAINT ar_invoice_items_pkey PRIMARY KEY (id);


--
-- Name: ar_invoices ar_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ar_invoices
    ADD CONSTRAINT ar_invoices_pkey PRIMARY KEY (id);


--
-- Name: asset_categories asset_categories_category_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_categories
    ADD CONSTRAINT asset_categories_category_name_key UNIQUE (category_name);


--
-- Name: asset_categories asset_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_categories
    ADD CONSTRAINT asset_categories_pkey PRIMARY KEY (id);


--
-- Name: asset_depreciation_logs asset_depreciation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_depreciation_logs
    ADD CONSTRAINT asset_depreciation_logs_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: audit_trail audit_trail_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_trail
    ADD CONSTRAINT audit_trail_pkey PRIMARY KEY (id);


--
-- Name: backups_log backups_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backups_log
    ADD CONSTRAINT backups_log_pkey PRIMARY KEY (id);


--
-- Name: batch_jobs batch_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch_jobs
    ADD CONSTRAINT batch_jobs_pkey PRIMARY KEY (id);


--
-- Name: board_committees board_committees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_committees
    ADD CONSTRAINT board_committees_pkey PRIMARY KEY (id);


--
-- Name: board_members board_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_members
    ADD CONSTRAINT board_members_pkey PRIMARY KEY (id);


--
-- Name: bom_headers bom_headers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_headers
    ADD CONSTRAINT bom_headers_pkey PRIMARY KEY (id);


--
-- Name: bom_headers bom_headers_product_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_headers
    ADD CONSTRAINT bom_headers_product_name_key UNIQUE (product_name);


--
-- Name: bom_items bom_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_pkey PRIMARY KEY (id);


--
-- Name: boq boq_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boq
    ADD CONSTRAINT boq_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_account_id_project_name_fiscal_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_account_id_project_name_fiscal_year_key UNIQUE (account_id, project_name, fiscal_year);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: chart_of_accounts chart_of_accounts_account_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_account_code_key UNIQUE (account_code);


--
-- Name: chart_of_accounts chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (id);


--
-- Name: client_consumptions client_consumptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_consumptions
    ADD CONSTRAINT client_consumptions_pkey PRIMARY KEY (id);


--
-- Name: client_delayed_payments client_delayed_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_delayed_payments
    ADD CONSTRAINT client_delayed_payments_pkey PRIMARY KEY (id);


--
-- Name: client_interactions client_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_interactions
    ADD CONSTRAINT client_interactions_pkey PRIMARY KEY (id);


--
-- Name: client_payment_history client_payment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_payment_history
    ADD CONSTRAINT client_payment_history_pkey PRIMARY KEY (id);


--
-- Name: client_preorders client_preorders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_preorders
    ADD CONSTRAINT client_preorders_pkey PRIMARY KEY (id);


--
-- Name: client_profiles client_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_profiles
    ADD CONSTRAINT client_profiles_pkey PRIMARY KEY (id);


--
-- Name: client_refunds client_refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_refunds
    ADD CONSTRAINT client_refunds_pkey PRIMARY KEY (id);


--
-- Name: client_stock_transactions client_stock_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_stock_transactions
    ADD CONSTRAINT client_stock_transactions_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: committee_memberships committee_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.committee_memberships
    ADD CONSTRAINT committee_memberships_pkey PRIMARY KEY (committee_id, member_id);


--
-- Name: companies companies_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_name_key UNIQUE (name);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: consolidation_runs consolidation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consolidation_runs
    ADD CONSTRAINT consolidation_runs_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: crm_interactions crm_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_interactions
    ADD CONSTRAINT crm_interactions_pkey PRIMARY KEY (id);


--
-- Name: crm_leads crm_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_pkey PRIMARY KEY (id);


--
-- Name: crm_opportunities crm_opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: daily_fx_rates daily_fx_rates_base_currency_target_currency_effective_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_fx_rates
    ADD CONSTRAINT daily_fx_rates_base_currency_target_currency_effective_date_key UNIQUE (base_currency, target_currency, effective_date);


--
-- Name: daily_fx_rates daily_fx_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_fx_rates
    ADD CONSTRAINT daily_fx_rates_pkey PRIMARY KEY (id);


--
-- Name: daily_reports daily_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_pkey PRIMARY KEY (id);


--
-- Name: depreciation_logs depreciation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.depreciation_logs
    ADD CONSTRAINT depreciation_logs_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: email_triggers_config email_triggers_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_triggers_config
    ADD CONSTRAINT email_triggers_config_pkey PRIMARY KEY (id);


--
-- Name: email_triggers_config email_triggers_config_trigger_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_triggers_config
    ADD CONSTRAINT email_triggers_config_trigger_type_key UNIQUE (trigger_type);


--
-- Name: emails_log emails_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emails_log
    ADD CONSTRAINT emails_log_pkey PRIMARY KEY (id);


--
-- Name: employee_documents employee_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (emp_id);


--
-- Name: eoy_logs eoy_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eoy_logs
    ADD CONSTRAINT eoy_logs_pkey PRIMARY KEY (id);


--
-- Name: eoy_logs eoy_logs_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eoy_logs
    ADD CONSTRAINT eoy_logs_year_key UNIQUE (year);


--
-- Name: equity_history equity_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equity_history
    ADD CONSTRAINT equity_history_pkey PRIMARY KEY (id);


--
-- Name: erp_countries erp_countries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.erp_countries
    ADD CONSTRAINT erp_countries_pkey PRIMARY KEY (erp_id, country_code);


--
-- Name: erp_inventory erp_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.erp_inventory
    ADD CONSTRAINT erp_inventory_pkey PRIMARY KEY (item_id);


--
-- Name: erp_projects erp_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.erp_projects
    ADD CONSTRAINT erp_projects_pkey PRIMARY KEY (project_id);


--
-- Name: erp_providers erp_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.erp_providers
    ADD CONSTRAINT erp_providers_pkey PRIMARY KEY (id);


--
-- Name: erp_sizes erp_sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.erp_sizes
    ADD CONSTRAINT erp_sizes_pkey PRIMARY KEY (erp_id, company_size);


--
-- Name: exchange_rates exchange_rates_base_currency_target_currency_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_base_currency_target_currency_key UNIQUE (base_currency, target_currency);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: field_permissions field_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_permissions
    ADD CONSTRAINT field_permissions_pkey PRIMARY KEY (id);


--
-- Name: field_permissions field_permissions_role_name_table_name_field_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_permissions
    ADD CONSTRAINT field_permissions_role_name_table_name_field_name_key UNIQUE (role_name, table_name, field_name);


--
-- Name: financial_discrepancies financial_discrepancies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_discrepancies
    ADD CONSTRAINT financial_discrepancies_pkey PRIMARY KEY (id);


--
-- Name: financial_periods financial_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_periods
    ADD CONSTRAINT financial_periods_pkey PRIMARY KEY (id);


--
-- Name: financial_periods financial_periods_year_month_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_periods
    ADD CONSTRAINT financial_periods_year_month_key UNIQUE (year, month);


--
-- Name: fiscal_periods fiscal_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fiscal_periods
    ADD CONSTRAINT fiscal_periods_pkey PRIMARY KEY (id);


--
-- Name: fixed_assets fixed_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_assets
    ADD CONSTRAINT fixed_assets_pkey PRIMARY KEY (id);


--
-- Name: fx_history fx_history_currency_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fx_history
    ADD CONSTRAINT fx_history_currency_date_key UNIQUE (currency, date);


--
-- Name: fx_history fx_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fx_history
    ADD CONSTRAINT fx_history_pkey PRIMARY KEY (id);


--
-- Name: fx_rates_history fx_rates_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fx_rates_history
    ADD CONSTRAINT fx_rates_history_pkey PRIMARY KEY (id);


--
-- Name: gl_mappings gl_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gl_mappings
    ADD CONSTRAINT gl_mappings_pkey PRIMARY KEY (id);


--
-- Name: gl_mappings gl_mappings_transaction_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gl_mappings
    ADD CONSTRAINT gl_mappings_transaction_type_key UNIQUE (transaction_type);


--
-- Name: goods_receipt_notes goods_receipt_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goods_receipt_notes
    ADD CONSTRAINT goods_receipt_notes_pkey PRIMARY KEY (id);


--
-- Name: grn grn_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grn
    ADD CONSTRAINT grn_pkey PRIMARY KEY (id);


--
-- Name: installments installments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installments
    ADD CONSTRAINT installments_pkey PRIMARY KEY (id);


--
-- Name: intercompany_mappings intercompany_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intercompany_mappings
    ADD CONSTRAINT intercompany_mappings_pkey PRIMARY KEY (id);


--
-- Name: inventory_bookings inventory_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_bookings
    ADD CONSTRAINT inventory_bookings_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_item_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_item_code_key UNIQUE (item_code);


--
-- Name: inventory_items inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey1 PRIMARY KEY (id);


--
-- Name: inventory_reservations inventory_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_reservations
    ADD CONSTRAINT inventory_reservations_pkey PRIMARY KEY (id);


--
-- Name: inventory_sales inventory_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_sales
    ADD CONSTRAINT inventory_sales_pkey PRIMARY KEY (id);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


--
-- Name: inventory_transfers inventory_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_pkey PRIMARY KEY (id);


--
-- Name: inventory_usage inventory_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_usage
    ADD CONSTRAINT inventory_usage_pkey PRIMARY KEY (usage_id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: leaves leaves_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaves
    ADD CONSTRAINT leaves_pkey PRIMARY KEY (id);


--
-- Name: ledger ledger_new_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger
    ADD CONSTRAINT ledger_new_pkey PRIMARY KEY (id);


--
-- Name: legal_entities legal_entities_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_entities
    ADD CONSTRAINT legal_entities_name_key UNIQUE (name);


--
-- Name: legal_entities legal_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_entities
    ADD CONSTRAINT legal_entities_pkey PRIMARY KEY (id);


--
-- Name: material_usage material_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_usage
    ADD CONSTRAINT material_usage_pkey PRIMARY KEY (id);


--
-- Name: metadata_entities metadata_entities_entity_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metadata_entities
    ADD CONSTRAINT metadata_entities_entity_key_key UNIQUE (entity_key);


--
-- Name: metadata_entities metadata_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metadata_entities
    ADD CONSTRAINT metadata_entities_pkey PRIMARY KEY (id);


--
-- Name: metadata_fields metadata_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metadata_fields
    ADD CONSTRAINT metadata_fields_pkey PRIMARY KEY (id);


--
-- Name: new_module new_module_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.new_module
    ADD CONSTRAINT new_module_pkey PRIMARY KEY (id);


--
-- Name: notification_subscriptions notification_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_subscriptions
    ADD CONSTRAINT notification_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: notification_subscriptions notification_subscriptions_user_id_event_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_subscriptions
    ADD CONSTRAINT notification_subscriptions_user_id_event_type_key UNIQUE (user_id, event_type);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: org_units org_units_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.org_units
    ADD CONSTRAINT org_units_code_key UNIQUE (code);


--
-- Name: org_units org_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.org_units
    ADD CONSTRAINT org_units_pkey PRIMARY KEY (id);


--
-- Name: organization_units organization_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_units
    ADD CONSTRAINT organization_units_pkey PRIMARY KEY (id);


--
-- Name: outstanding_dues outstanding_dues_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outstanding_dues
    ADD CONSTRAINT outstanding_dues_pkey PRIMARY KEY (id);


--
-- Name: outstanding_settlements outstanding_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outstanding_settlements
    ADD CONSTRAINT outstanding_settlements_pkey PRIMARY KEY (id);


--
-- Name: partner_deposits partner_deposits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_deposits
    ADD CONSTRAINT partner_deposits_pkey PRIMARY KEY (id);


--
-- Name: partner_documents partner_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_documents
    ADD CONSTRAINT partner_documents_pkey PRIMARY KEY (id);


--
-- Name: partner_financial_log partner_financial_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_financial_log
    ADD CONSTRAINT partner_financial_log_pkey PRIMARY KEY (id);


--
-- Name: partner_history partner_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_history
    ADD CONSTRAINT partner_history_pkey PRIMARY KEY (id);


--
-- Name: partner_transactions partner_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_transactions
    ADD CONSTRAINT partner_transactions_pkey PRIMARY KEY (id);


--
-- Name: partner_withdrawals partner_withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_withdrawals
    ADD CONSTRAINT partner_withdrawals_pkey PRIMARY KEY (id);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: payment_allocations payment_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT payment_allocations_pkey PRIMARY KEY (id);


--
-- Name: payment_receipts payment_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_receipts
    ADD CONSTRAINT payment_receipts_pkey PRIMARY KEY (id);


--
-- Name: payroll payroll_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_pkey PRIMARY KEY (id);


--
-- Name: performance_reviews performance_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performance_reviews
    ADD CONSTRAINT performance_reviews_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: po_ddp_charges po_ddp_charges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_ddp_charges
    ADD CONSTRAINT po_ddp_charges_pkey PRIMARY KEY (id);


--
-- Name: po_ddp_lcy_charges po_ddp_lcy_charges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_ddp_lcy_charges
    ADD CONSTRAINT po_ddp_lcy_charges_pkey PRIMARY KEY (id);


--
-- Name: po_expenses po_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_expenses
    ADD CONSTRAINT po_expenses_pkey PRIMARY KEY (id);


--
-- Name: po_lc_registry po_lc_registry_lc_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_lc_registry
    ADD CONSTRAINT po_lc_registry_lc_number_key UNIQUE (lc_number);


--
-- Name: po_lc_registry po_lc_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_lc_registry
    ADD CONSTRAINT po_lc_registry_pkey PRIMARY KEY (id);


--
-- Name: production_logs production_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_logs
    ADD CONSTRAINT production_logs_pkey PRIMARY KEY (id);


--
-- Name: profit_distributions profit_distributions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profit_distributions
    ADD CONSTRAINT profit_distributions_pkey PRIMARY KEY (dist_id);


--
-- Name: project_expenses project_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_expenses
    ADD CONSTRAINT project_expenses_pkey PRIMARY KEY (expense_id);


--
-- Name: project_investors project_investors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_investors
    ADD CONSTRAINT project_investors_pkey PRIMARY KEY (id);


--
-- Name: project_items project_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_items
    ADD CONSTRAINT project_items_pkey PRIMARY KEY (item_id);


--
-- Name: project_partners project_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_partners
    ADD CONSTRAINT project_partners_pkey PRIMARY KEY (id);


--
-- Name: project_performance project_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_performance
    ADD CONSTRAINT project_performance_pkey PRIMARY KEY (id);


--
-- Name: project_profiles project_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_profiles
    ADD CONSTRAINT project_profiles_pkey PRIMARY KEY (org_unit_id);


--
-- Name: projects projects_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_name_key UNIQUE (name);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects projects_project_serial_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_project_serial_key UNIQUE (project_serial);


--
-- Name: property_units property_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_units
    ADD CONSTRAINT property_units_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: real_estate_contracts real_estate_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_contracts
    ADD CONSTRAINT real_estate_contracts_pkey PRIMARY KEY (id);


--
-- Name: real_estate_installments real_estate_installments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_installments
    ADD CONSTRAINT real_estate_installments_pkey PRIMARY KEY (id);


--
-- Name: real_estate_projects real_estate_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_projects
    ADD CONSTRAINT real_estate_projects_pkey PRIMARY KEY (id);


--
-- Name: real_estate_unit_history real_estate_unit_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_unit_history
    ADD CONSTRAINT real_estate_unit_history_pkey PRIMARY KEY (id);


--
-- Name: real_estate_units real_estate_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_units
    ADD CONSTRAINT real_estate_units_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: returns returns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_pkey PRIMARY KEY (id);


--
-- Name: rfq rfq_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfq
    ADD CONSTRAINT rfq_pkey PRIMARY KEY (id);


--
-- Name: role_audit_logs role_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_audit_logs
    ADD CONSTRAINT role_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: role_permissions_matrix role_permissions_matrix_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions_matrix
    ADD CONSTRAINT role_permissions_matrix_pkey PRIMARY KEY (id);


--
-- Name: role_permissions_matrix role_permissions_matrix_role_name_module_name_screen_name_a_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions_matrix
    ADD CONSTRAINT role_permissions_matrix_role_name_module_name_screen_name_a_key UNIQUE (role_name, module_name, screen_name, action_name);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: rtv_transactions rtv_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rtv_transactions
    ADD CONSTRAINT rtv_transactions_pkey PRIMARY KEY (id);


--
-- Name: sales_commissions sales_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_commissions
    ADD CONSTRAINT sales_commissions_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_pkey PRIMARY KEY (order_id);


--
-- Name: sales_settlements sales_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_settlements
    ADD CONSTRAINT sales_settlements_pkey PRIMARY KEY (id);


--
-- Name: scheduled_emails scheduled_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scheduled_emails
    ADD CONSTRAINT scheduled_emails_pkey PRIMARY KEY (id);


--
-- Name: security_audit_trail security_audit_trail_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_audit_trail
    ADD CONSTRAINT security_audit_trail_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: settlement_customers settlement_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlement_customers
    ADD CONSTRAINT settlement_customers_pkey PRIMARY KEY (id);


--
-- Name: staff_advances staff_advances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_advances
    ADD CONSTRAINT staff_advances_pkey PRIMARY KEY (id);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: stakeholder_engagements stakeholder_engagements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stakeholder_engagements
    ADD CONSTRAINT stakeholder_engagements_pkey PRIMARY KEY (id);


--
-- Name: stakeholders stakeholders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stakeholders
    ADD CONSTRAINT stakeholders_pkey PRIMARY KEY (id);


--
-- Name: stock_adjustments stock_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_pkey PRIMARY KEY (id);


--
-- Name: stock_issues stock_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_issues
    ADD CONSTRAINT stock_issues_pkey PRIMARY KEY (id);


--
-- Name: subcontractors sub_proj_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcontractors
    ADD CONSTRAINT sub_proj_unique UNIQUE (name, project_name);


--
-- Name: subcontractor_invoices subcontractor_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcontractor_invoices
    ADD CONSTRAINT subcontractor_invoices_pkey PRIMARY KEY (id);


--
-- Name: subcontractor_items subcontractor_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcontractor_items
    ADD CONSTRAINT subcontractor_items_pkey PRIMARY KEY (id);


--
-- Name: subcontractor_statements subcontractor_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcontractor_statements
    ADD CONSTRAINT subcontractor_statements_pkey PRIMARY KEY (id);


--
-- Name: subcontractors subcontractors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcontractors
    ADD CONSTRAINT subcontractors_pkey PRIMARY KEY (id);


--
-- Name: supplier_ratings supplier_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_ratings
    ADD CONSTRAINT supplier_ratings_pkey PRIMARY KEY (id);


--
-- Name: supplier_ratings supplier_ratings_supplier_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_ratings
    ADD CONSTRAINT supplier_ratings_supplier_name_key UNIQUE (supplier_name);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: system_backups system_backups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_backups
    ADD CONSTRAINT system_backups_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_config_key_key UNIQUE (config_key);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: system_events system_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_events
    ADD CONSTRAINT system_events_pkey PRIMARY KEY (id);


--
-- Name: system_notifications system_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_notifications
    ADD CONSTRAINT system_notifications_pkey PRIMARY KEY (id);


--
-- Name: system_parameters system_parameters_category_value_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_parameters
    ADD CONSTRAINT system_parameters_category_value_key UNIQUE (category, value);


--
-- Name: system_parameters system_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_parameters
    ADD CONSTRAINT system_parameters_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: tenant_settings tenant_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_tenant_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_tenant_key_key UNIQUE (tenant_key);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (trans_id);


--
-- Name: project_partners unique_project_partner; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_partners
    ADD CONSTRAINT unique_project_partner UNIQUE (project_id, partner_id);


--
-- Name: unit_history unit_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_history
    ADD CONSTRAINT unit_history_pkey PRIMARY KEY (id);


--
-- Name: approval_limits uq_approval_role_module; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_limits
    ADD CONSTRAINT uq_approval_role_module UNIQUE (role, module);


--
-- Name: user_org_units user_org_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_org_units
    ADD CONSTRAINT user_org_units_pkey PRIMARY KEY (user_id, org_unit_id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: vendor_bills vendor_bills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_bills
    ADD CONSTRAINT vendor_bills_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (vendor_id);


--
-- Name: voucher_sequences voucher_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voucher_sequences
    ADD CONSTRAINT voucher_sequences_pkey PRIMARY KEY (company_id);


--
-- Name: warehouses warehouses_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_name_key UNIQUE (name);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: work_orders work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_pkey PRIMARY KEY (id);


--
-- Name: work_orders work_orders_wo_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_wo_number_key UNIQUE (wo_number);


--
-- Name: workflow_definitions workflow_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_definitions
    ADD CONSTRAINT workflow_definitions_pkey PRIMARY KEY (id);


--
-- Name: workflow_history workflow_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_history
    ADD CONSTRAINT workflow_history_pkey PRIMARY KEY (id);


--
-- Name: workflow_instances workflow_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_instances
    ADD CONSTRAINT workflow_instances_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: idx_attachments_table_record; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attachments_table_record ON public.attachments USING btree (table_name, record_id);


--
-- Name: idx_boq_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_boq_project ON public.boq USING btree (project_name);


--
-- Name: idx_pfl_project_partner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pfl_project_partner ON public.partner_financial_log USING btree (project_id, partner_id);


--
-- Name: idx_po_master; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_po_master ON public.purchase_orders USING btree (master_po_no);


--
-- Name: idx_projects_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_name ON public.projects USING btree (name);


--
-- Name: idx_projects_serial; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_serial ON public.projects USING btree (project_serial);


--
-- Name: idx_sub_invoices_sub_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sub_invoices_sub_id ON public.subcontractor_invoices USING btree (subcontractor_id);


--
-- Name: idx_sub_items_sub_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sub_items_sub_id ON public.subcontractor_items USING btree (subcontractor_id);


--
-- Name: ledger trg_ledger_integrity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE CONSTRAINT TRIGGER trg_ledger_integrity AFTER INSERT OR UPDATE ON public.ledger DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_ledger_balance();


--
-- Name: approval_history approval_history_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_history
    ADD CONSTRAINT approval_history_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(id);


--
-- Name: approval_history approval_history_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_history
    ADD CONSTRAINT approval_history_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.workflow_instances(id) ON DELETE CASCADE;


--
-- Name: ar_invoice_items ar_invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ar_invoice_items
    ADD CONSTRAINT ar_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.ar_invoices(id) ON DELETE CASCADE;


--
-- Name: asset_depreciation_logs asset_depreciation_logs_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_depreciation_logs
    ADD CONSTRAINT asset_depreciation_logs_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.fixed_assets(id);


--
-- Name: attendance attendance_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: board_committees board_committees_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_committees
    ADD CONSTRAINT board_committees_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: board_members board_members_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_members
    ADD CONSTRAINT board_members_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: board_members board_members_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_members
    ADD CONSTRAINT board_members_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;


--
-- Name: bom_items bom_items_bom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES public.bom_headers(id) ON DELETE CASCADE;


--
-- Name: chart_of_accounts chart_of_accounts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: chart_of_accounts chart_of_accounts_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: client_interactions client_interactions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_interactions
    ADD CONSTRAINT client_interactions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: client_preorders client_preorders_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_preorders
    ADD CONSTRAINT client_preorders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.customers(id);


--
-- Name: client_preorders client_preorders_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_preorders
    ADD CONSTRAINT client_preorders_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: committee_memberships committee_memberships_committee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.committee_memberships
    ADD CONSTRAINT committee_memberships_committee_id_fkey FOREIGN KEY (committee_id) REFERENCES public.board_committees(id) ON DELETE CASCADE;


--
-- Name: committee_memberships committee_memberships_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.committee_memberships
    ADD CONSTRAINT committee_memberships_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.board_members(id) ON DELETE CASCADE;


--
-- Name: consolidation_runs consolidation_runs_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consolidation_runs
    ADD CONSTRAINT consolidation_runs_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.legal_entities(id);


--
-- Name: contracts contracts_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.property_units(id) ON DELETE CASCADE;


--
-- Name: crm_interactions crm_interactions_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_interactions
    ADD CONSTRAINT crm_interactions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.crm_leads(id) ON DELETE CASCADE;


--
-- Name: crm_opportunities crm_opportunities_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.crm_leads(id) ON DELETE CASCADE;


--
-- Name: customers customers_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id);


--
-- Name: depreciation_logs depreciation_logs_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.depreciation_logs
    ADD CONSTRAINT depreciation_logs_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.fixed_assets(id) ON DELETE CASCADE;


--
-- Name: employee_documents employee_documents_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: equity_history equity_history_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equity_history
    ADD CONSTRAINT equity_history_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: equity_history equity_history_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equity_history
    ADD CONSTRAINT equity_history_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: erp_countries erp_countries_erp_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.erp_countries
    ADD CONSTRAINT erp_countries_erp_id_fkey FOREIGN KEY (erp_id) REFERENCES public.erp_providers(id);


--
-- Name: erp_sizes erp_sizes_erp_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.erp_sizes
    ADD CONSTRAINT erp_sizes_erp_id_fkey FOREIGN KEY (erp_id) REFERENCES public.erp_providers(id);


--
-- Name: installments installments_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installments
    ADD CONSTRAINT installments_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: intercompany_mappings intercompany_mappings_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intercompany_mappings
    ADD CONSTRAINT intercompany_mappings_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.legal_entities(id);


--
-- Name: inventory_bookings inventory_bookings_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_bookings
    ADD CONSTRAINT inventory_bookings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.customers(id);


--
-- Name: inventory_bookings inventory_bookings_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_bookings
    ADD CONSTRAINT inventory_bookings_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory_items(id);


--
-- Name: inventory_items inventory_items_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: inventory_items inventory_items_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: inventory_sales inventory_sales_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_sales
    ADD CONSTRAINT inventory_sales_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.customers(id);


--
-- Name: inventory_sales inventory_sales_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_sales
    ADD CONSTRAINT inventory_sales_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: invoices invoices_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: leave_requests leave_requests_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: ledger ledger_new_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger
    ADD CONSTRAINT ledger_new_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT;


--
-- Name: ledger ledger_new_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger
    ADD CONSTRAINT ledger_new_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: ledger ledger_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger
    ADD CONSTRAINT ledger_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id);


--
-- Name: legal_entities legal_entities_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_entities
    ADD CONSTRAINT legal_entities_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.legal_entities(id);


--
-- Name: metadata_fields metadata_fields_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metadata_fields
    ADD CONSTRAINT metadata_fields_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.metadata_entities(id) ON DELETE CASCADE;


--
-- Name: notification_subscriptions notification_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_subscriptions
    ADD CONSTRAINT notification_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: org_units org_units_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.org_units
    ADD CONSTRAINT org_units_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.org_units(id);


--
-- Name: organization_units organization_units_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_units
    ADD CONSTRAINT organization_units_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: organization_units organization_units_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_units
    ADD CONSTRAINT organization_units_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.organization_units(id);


--
-- Name: partner_documents partner_documents_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_documents
    ADD CONSTRAINT partner_documents_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: partner_transactions partner_transactions_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_transactions
    ADD CONSTRAINT partner_transactions_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id);


--
-- Name: partners partners_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: payment_receipts payment_receipts_installment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_receipts
    ADD CONSTRAINT payment_receipts_installment_id_fkey FOREIGN KEY (installment_id) REFERENCES public.installments(id) ON DELETE CASCADE;


--
-- Name: performance_reviews performance_reviews_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performance_reviews
    ADD CONSTRAINT performance_reviews_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: po_lc_registry po_lc_registry_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_lc_registry
    ADD CONSTRAINT po_lc_registry_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: production_logs production_logs_wo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_logs
    ADD CONSTRAINT production_logs_wo_id_fkey FOREIGN KEY (wo_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;


--
-- Name: project_investors project_investors_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_investors
    ADD CONSTRAINT project_investors_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_performance project_performance_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_performance
    ADD CONSTRAINT project_performance_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_profiles project_profiles_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_profiles
    ADD CONSTRAINT project_profiles_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.organization_units(id);


--
-- Name: projects projects_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: projects projects_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id);


--
-- Name: purchase_orders purchase_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: purchase_orders purchase_orders_lc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_lc_id_fkey FOREIGN KEY (lc_id) REFERENCES public.po_lc_registry(id);


--
-- Name: real_estate_contracts real_estate_contracts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_contracts
    ADD CONSTRAINT real_estate_contracts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: real_estate_contracts real_estate_contracts_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_contracts
    ADD CONSTRAINT real_estate_contracts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: real_estate_contracts real_estate_contracts_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_contracts
    ADD CONSTRAINT real_estate_contracts_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.real_estate_units(id);


--
-- Name: real_estate_installments real_estate_installments_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_installments
    ADD CONSTRAINT real_estate_installments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: real_estate_installments real_estate_installments_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_installments
    ADD CONSTRAINT real_estate_installments_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.real_estate_contracts(id);


--
-- Name: real_estate_projects real_estate_projects_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_projects
    ADD CONSTRAINT real_estate_projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: real_estate_unit_history real_estate_unit_history_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_unit_history
    ADD CONSTRAINT real_estate_unit_history_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.real_estate_units(id) ON DELETE CASCADE;


--
-- Name: real_estate_units real_estate_units_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.real_estate_units
    ADD CONSTRAINT real_estate_units_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.real_estate_projects(id);


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: sales_commissions sales_commissions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_commissions
    ADD CONSTRAINT sales_commissions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: staff staff_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: stakeholder_engagements stakeholder_engagements_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stakeholder_engagements
    ADD CONSTRAINT stakeholder_engagements_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.organization_units(id);


--
-- Name: stakeholder_engagements stakeholder_engagements_stakeholder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stakeholder_engagements
    ADD CONSTRAINT stakeholder_engagements_stakeholder_id_fkey FOREIGN KEY (stakeholder_id) REFERENCES public.stakeholders(id);


--
-- Name: subcontractor_invoices subcontractor_invoices_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcontractor_invoices
    ADD CONSTRAINT subcontractor_invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: subcontractor_invoices subcontractor_invoices_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcontractor_invoices
    ADD CONSTRAINT subcontractor_invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: subcontractor_invoices subcontractor_invoices_sub_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcontractor_invoices
    ADD CONSTRAINT subcontractor_invoices_sub_item_id_fkey FOREIGN KEY (sub_item_id) REFERENCES public.subcontractor_items(id) ON DELETE CASCADE;


--
-- Name: subcontractor_items subcontractor_items_boq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcontractor_items
    ADD CONSTRAINT subcontractor_items_boq_id_fkey FOREIGN KEY (boq_id) REFERENCES public.boq(id) ON DELETE SET NULL;


--
-- Name: subcontractor_items subcontractor_items_subcontractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcontractor_items
    ADD CONSTRAINT subcontractor_items_subcontractor_id_fkey FOREIGN KEY (subcontractor_id) REFERENCES public.subcontractors(id) ON DELETE CASCADE;


--
-- Name: subcontractors subcontractors_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcontractors
    ADD CONSTRAINT subcontractors_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: system_notifications system_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_notifications
    ADD CONSTRAINT system_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: transactions transactions_acc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_acc_id_fkey FOREIGN KEY (acc_id) REFERENCES public.accounts_chart(acc_id);


--
-- Name: user_org_units user_org_units_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_org_units
    ADD CONSTRAINT user_org_units_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: voucher_sequences voucher_sequences_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voucher_sequences
    ADD CONSTRAINT voucher_sequences_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: work_orders work_orders_bom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES public.bom_headers(id);


--
-- Name: workflow_history workflow_history_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_history
    ADD CONSTRAINT workflow_history_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id);


--
-- Name: workflow_instances workflow_instances_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_instances
    ADD CONSTRAINT workflow_instances_definition_id_fkey FOREIGN KEY (definition_id) REFERENCES public.workflow_definitions(id);


--
-- PostgreSQL database dump complete
--

\unrestrict NwLWdMOWcoBQTGADyoxagHlDm8R2P5b73rq5iG8sbfApxYK3BSKWaLFu5biCC1a

