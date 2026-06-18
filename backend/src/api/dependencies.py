"""
api/dependencies.py
-------------------
FastAPI dependency injection: JWT extraction from Bearer header,
current-user resolution, and role-based access guards.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

try:
    from ..security.auth import decode_token, TokenData
except ImportError:
    decode_token = None
    TokenData = None

try:
    from ..utils.logger import get_logger
    logger = get_logger(__name__)
except ImportError:
    import logging
    logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    """
    Extract and validate the JWT Bearer token from the Authorization header.

    Returns:
        TokenData with username and role.

    Raises:
        HTTPException 401 if token is missing or invalid.
    """
    if decode_token is None or TokenData is None:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Authentication is not configured (security.auth module missing)",
        )
    token = credentials.credentials
    token_data = decode_token(token)
    logger.debug(f"Authenticated request from: {token_data.username} (role={token_data.role})")
    return token_data


def require_admin(current_user=Depends(get_current_user)):
    """Guard: only allow Admin role."""
    if current_user.role != "Admin":
        logger.warning(f"Admin access denied for user: {current_user.username}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


def require_operator(current_user=Depends(get_current_user)):
    """Guard: allow Admin or Operator roles."""
    if current_user.role not in ("Admin", "Operator"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operator or Admin privileges required",
        )
    return current_user
