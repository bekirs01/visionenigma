"""
Email integration: interfaces and stubs.
- EmailFetcher: fetch new messages (IMAP in future).
- EmailSender: send reply (SMTP in future).
MVP: Mock implementations only. Real IMAP/SMTP are stubbed.
"""
from abc import ABC, abstractmethod
from typing import List, Any, Optional
from dataclasses import dataclass


@dataclass
class RawEmailMessage:
    message_id: str
    subject: str
    body: str
    sender_email: str
    sender_name: Optional[str]
    received_at: Optional[str]


class EmailFetcher(ABC):
    @abstractmethod
    def fetch_new_messages(self) -> List[RawEmailMessage]:
        pass


class EmailSender(ABC):
    @abstractmethod
    def send_reply(self, to_email: str, subject: str, body: str, in_reply_to: Optional[str] = None) -> bool:
        pass


class MockEmailFetcher(EmailFetcher):
    """Returns empty list. For MVP no real fetch."""

    def fetch_new_messages(self) -> List[RawEmailMessage]:
        return []


class MockEmailSender(EmailSender):
    """Logs only. Does not send real email."""

    def send_reply(self, to_email: str, subject: str, body: str, in_reply_to: Optional[str] = None) -> bool:
        # TODO: log to stdout or audit table
        return True


# PLACEHOLDER: future IMAP/SMTP implementations
class ImapEmailFetcher(EmailFetcher):
    """Stub. Requires IMAP credentials and implementation."""

    def __init__(self, host: str, port: int, user: str, password: str):
        self.host = host
        self.port = port
        self.user = user
        self.password = password

    def fetch_new_messages(self) -> List[RawEmailMessage]:
        raise NotImplementedError("IMAP integration is not implemented. Use EMAIL_MODE=mock.")


class SmtpEmailSender(EmailSender):
    """Stub. Requires SMTP credentials and implementation."""

    def __init__(self, host: str, port: int, user: str, password: str):
        self.host = host
        self.port = port
        self.user = user
        self.password = password

    def send_reply(self, to_email: str, subject: str, body: str, in_reply_to: Optional[str] = None) -> bool:
        raise NotImplementedError("SMTP integration is not implemented. Use EMAIL_MODE=mock.")
